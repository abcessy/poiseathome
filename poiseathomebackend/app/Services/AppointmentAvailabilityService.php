<?php

namespace App\Services;

use App\Models\User;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\StaffDayOff;
use Carbon\Carbon;

class AppointmentAvailabilityService
{
    public function getSystemHandlingCapacity(): int
    {
        $configured = (int) config('poiseathome.booking.max_concurrent_appointments', 0);
        if ($configured > 0) {
            return $configured;
        }

        $activeStaffCount = User::where('role', 'staff')
            ->where('is_active', true)
            ->whereHas('profile', fn ($q) => $q->where('is_available', true))
            ->count();

        return max($activeStaffCount, 1);
    }

    public function getAvailableSlots(Service $service, User $staff, $dateString, int $customDuration = 0, $customer = null, ?int $ignoreAppointmentId = null)
    {
        // 1. Validate Date
        $tz = config('app.timezone', 'Asia/Manila');
        $date = Carbon::parse($dateString, $tz);
        $now = Carbon::now($tz);
        
        $minNotice = (int) config('poiseathome.booking.minimum_notice_hours', 2);
        $maxAdvance = (int) config('poiseathome.booking.maximum_advance_days', 60);

        if ($date->startOfDay()->lt($now->startOfDay())) {
            return []; // Past date
        }

        if ($date->startOfDay()->gt($now->clone()->addDays($maxAdvance)->startOfDay())) {
            return []; // Too far in advance
        }

        // 2. Validate Staff Day Off
        $hasDayOff = StaffDayOff::where('staff_user_id', $staff->id)
            ->whereDate('date', $date->format('Y-m-d'))
            ->exists();
        
        if ($hasDayOff) {
            return [];
        }

        // 3. Define Candidate Slots
        $profile = $staff->profile;
        $opening = $profile?->working_start_time ?: config('poiseathome.booking.opening_time', '09:00');
        $closing = $profile?->working_end_time ?: config('poiseathome.booking.closing_time', '18:00');
        $openingTime = Carbon::parse($date->format('Y-m-d') . ' ' . $opening, $tz);
        $closingTime = Carbon::parse($date->format('Y-m-d') . ' ' . $closing, $tz);
        $interval = (int) config('poiseathome.booking.slot_interval_minutes', 30);
        $duration = $customDuration > 0 ? $customDuration : (int) $service->duration_minutes;

        // 4. Fetch Existing Appointments and System Capacity
        $appointmentsQuery = Appointment::whereDate('appointment_date', $date->format('Y-m-d'))
            ->whereIn('status', ['pending', 'confirmed', 'in_progress']);

        if ($ignoreAppointmentId) {
            $appointmentsQuery->whereKeyNot($ignoreAppointmentId);
        }

        $allDayAppointments = $appointmentsQuery->get(['id', 'staff_user_id', 'start_time', 'end_time']);

        $staffAppointments = $allDayAppointments->where('staff_user_id', $staff->id);
        $customerAppointments = collect();
        if ($customer) {
            $customerId = $customer instanceof User ? $customer->id : (int) $customer;
            $customerQuery = Appointment::where('customer_id', $customerId)
                ->whereDate('appointment_date', $date->format('Y-m-d'))
                ->whereIn('status', ['pending', 'confirmed', 'in_progress']);
            if ($ignoreAppointmentId) {
                $customerQuery->whereKeyNot($ignoreAppointmentId);
            }
            $customerAppointments = $customerQuery->get(['id', 'start_time', 'end_time']);
        }
        $systemCapacity = $this->getSystemHandlingCapacity();

        $slots = [];
        $current = $openingTime->clone();

        while (true) {
            $slotStart = $current->clone();
            $slotEnd = $current->clone()->addMinutes($duration);

            if ($slotEnd->gt($closingTime)) {
                break;
            }

            // Check Minimum Notice
            if ($slotStart->lt($now->clone()->addHours($minNotice))) {
                $current->addMinutes($interval);
                continue;
            }

            // Check Stylist Overlaps
            $conflict = false;
            foreach ($staffAppointments as $app) {
                $appStart = Carbon::parse($date->format('Y-m-d') . ' ' . $app->start_time, $tz);
                $appEnd = Carbon::parse($date->format('Y-m-d') . ' ' . $app->end_time, $tz);

                // existing_start < requested_end AND existing_end > requested_start
                if ($appStart->lt($slotEnd) && $appEnd->gt($slotStart)) {
                    $conflict = true;
                    break;
                }
            }

            // Check Customer Overlaps (prevent double booking for customer)
            if (!$conflict && $customerAppointments->isNotEmpty()) {
                foreach ($customerAppointments as $cApp) {
                    $cAppStart = Carbon::parse($date->format('Y-m-d') . ' ' . $cApp->start_time, $tz);
                    $cAppEnd = Carbon::parse($date->format('Y-m-d') . ' ' . $cApp->end_time, $tz);

                    if ($cAppStart->lt($slotEnd) && $cAppEnd->gt($slotStart)) {
                        $conflict = true;
                        break;
                    }
                }
            }

            // Check System Handling Capacity
            if (!$conflict) {
                $overlappingCount = 0;
                foreach ($allDayAppointments as $app) {
                    $appStart = Carbon::parse($date->format('Y-m-d') . ' ' . $app->start_time, $tz);
                    $appEnd = Carbon::parse($date->format('Y-m-d') . ' ' . $app->end_time, $tz);
                    if ($appStart->lt($slotEnd) && $appEnd->gt($slotStart)) {
                        $overlappingCount++;
                    }
                }
                if ($overlappingCount >= $systemCapacity) {
                    $conflict = true;
                }
            }

            if (!$conflict) {
                $slots[] = [
                    'start' => $slotStart->format('H:i'),
                    'end' => $slotEnd->format('H:i'),
                ];
            }

            $current->addMinutes($interval);
        }

        return $slots;
    }
}
