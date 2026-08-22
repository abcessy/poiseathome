<?php

namespace App\Services;

use App\Models\User;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\StaffDayOff;
use Carbon\Carbon;

class AppointmentAvailabilityService
{
    public function getAvailableSlots(Service $service, User $staff, $dateString)
    {
        // 1. Validate Date
        $date = Carbon::parse($dateString, config('app.timezone'));
        $now = Carbon::now(config('app.timezone'));
        
        $minNotice = config('poiseathome.booking.minimum_notice_hours', 2);
        $maxAdvance = config('poiseathome.booking.maximum_advance_days', 60);

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
        $openingTime = Carbon::parse($date->format('Y-m-d') . ' ' . config('poiseathome.booking.opening_time', '09:00'));
        $closingTime = Carbon::parse($date->format('Y-m-d') . ' ' . config('poiseathome.booking.closing_time', '18:00'));
        $interval = config('poiseathome.booking.slot_interval_minutes', 30);
        $duration = $service->duration_minutes;

        // 4. Fetch Existing Appointments
        $existingAppointments = Appointment::where('staff_user_id', $staff->id)
            ->whereDate('appointment_date', $date->format('Y-m-d'))
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->get(['start_time', 'end_time']);

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

            // Check Overlaps
            $conflict = false;
            foreach ($existingAppointments as $app) {
                $appStart = Carbon::parse($date->format('Y-m-d') . ' ' . $app->start_time);
                $appEnd = Carbon::parse($date->format('Y-m-d') . ' ' . $app->end_time);

                // existing_start < requested_end AND existing_end > requested_start
                if ($appStart->lt($slotEnd) && $appEnd->gt($slotStart)) {
                    $conflict = true;
                    break;
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
