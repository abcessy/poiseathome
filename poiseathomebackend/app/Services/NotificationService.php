<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function notifyUser(User $user, array $data)
    {
        try {
            return Notification::create(array_merge($data, [
                'user_id' => $user->id,
            ]));
        } catch (\Exception $e) {
            Log::error('Notification failed: ' . $e->getMessage());
            return null;
        }
    }

    public function notifyAdmins(array $data)
    {
        try {
            $admins = User::where('role', 'admin')->get();
            $notifications = [];
            foreach ($admins as $admin) {
                $notifications[] = array_merge($data, [
                    'user_id' => $admin->id,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
            if (count($notifications) > 0) {
                Notification::insert($notifications);
            }
        } catch (\Exception $e) {
            Log::error('Admin Notification failed: ' . $e->getMessage());
        }
    }

    public function notifyStaff(User $staff, array $data)
    {
        $this->notifyUser($staff, $data);
    }

    public function notifyAppointmentStatusChange($appointment)
    {
        $messages = [
            'confirmed' => ['title' => 'Appointment Confirmed', 'msg' => 'Your appointment ' . $appointment->appointment_number . ' has been confirmed.'],
            'in_progress' => ['title' => 'Home Service Started', 'msg' => 'Your home service for appointment ' . $appointment->appointment_number . ' has started.'],
            'completed' => ['title' => 'Appointment Completed', 'msg' => 'Your appointment ' . $appointment->appointment_number . ' is completed. Thank you!'],
        ];

        if (isset($messages[$appointment->status])) {
            $this->notifyUser($appointment->customer, [
                'type' => 'appointment_' . $appointment->status,
                'title' => $messages[$appointment->status]['title'],
                'message' => $messages[$appointment->status]['msg'],
                'reference_type' => 'appointment',
                'reference_code' => $appointment->appointment_number,
            ]);
        }
    }

    public function notifyAppointmentCancellation($appointment)
    {
        $reason = $appointment->cancellation_reason ? " Reason: {$appointment->cancellation_reason}." : '';

        if ($appointment->customer) {
            $this->notifyUser($appointment->customer, [
                'type' => 'appointment_cancelled',
                'title' => 'Appointment Cancelled',
                'message' => 'Your appointment ' . $appointment->appointment_number . ' has been cancelled.' . $reason,
                'reference_type' => 'appointment',
                'reference_code' => $appointment->appointment_number,
            ]);
        }

        if ($appointment->staff) {
            $this->notifyStaff($appointment->staff, [
                'type' => 'appointment_cancelled',
                'title' => 'Appointment Cancelled',
                'message' => 'Appointment ' . $appointment->appointment_number . ' has been cancelled.' . $reason,
                'reference_type' => 'appointment',
                'reference_id' => $appointment->id,
            ]);
        }

        // Route cancellation notifications to the admin, not just the staff.
        $this->notifyAdmins([
            'type' => 'appointment_cancelled',
            'title' => 'Appointment Cancelled',
            'message' => 'Appointment ' . $appointment->appointment_number . ' was cancelled.' . $reason,
            'reference_type' => 'appointment',
            'reference_id' => $appointment->id,
        ]);
    }
}
