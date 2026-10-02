<?php

namespace App\Services\Email;

use App\Contracts\TransactionalEmailService;
use App\Exceptions\EmailDeliveryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoEmailService implements TransactionalEmailService
{
    public function send(string $recipient, string $subject, string $content): void
    {
        $apiKey = trim((string) (config('services.brevo.key') ?: config('services.resend.key')));

        if ($apiKey === '') {
            if (app()->environment('production')) {
                Log::error('Transactional email delivery is unavailable because Brevo is not configured.');
                throw new EmailDeliveryException('Transactional email delivery is unavailable.');
            }

            Log::info($content, ['recipient' => $recipient, 'delivery' => 'local-log']);

            return;
        }

        $fromEmail = trim((string) (config('services.brevo.from_email') ?: config('services.resend.from_email', 'noreply@poiseathome.site')));
        $fromName = trim((string) (config('services.brevo.from_name') ?: config('services.resend.from_name', 'PoiseAtHome')));

        if ($fromEmail === '') {
            $fromEmail = 'noreply@poiseathome.site';
        }

        try {
            $response = Http::acceptJson()
                ->withHeaders([
                    'api-key' => $apiKey,
                    'content-type' => 'application/json',
                ])
                ->timeout(10)
                ->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => [
                        'name' => $fromName,
                        'email' => $fromEmail,
                    ],
                    'to' => [
                        ['email' => $recipient],
                    ],
                    'subject' => $subject,
                    'htmlContent' => $content,
                ]);
        } catch (ConnectionException $exception) {
            Log::warning('Brevo email request failed to connect.', ['exception' => $exception::class]);
            throw new EmailDeliveryException('Transactional email delivery failed.', previous: $exception);
        }

        $messageId = $response->json('messageId') ?? $response->json('id');
        if (! $response->successful() || ! is_string($messageId)) {
            Log::warning('Brevo email request was rejected.', ['status' => $response->status()]);
            throw new EmailDeliveryException('Transactional email delivery failed.');
        }
    }
}
