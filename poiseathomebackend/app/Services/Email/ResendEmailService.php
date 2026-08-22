<?php

namespace App\Services\Email;

use App\Contracts\TransactionalEmailService;
use App\Exceptions\EmailDeliveryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResendEmailService implements TransactionalEmailService
{
    public function send(string $recipient, string $subject, string $content): void
    {
        $apiKey = trim((string) config('services.resend.key'));

        if ($apiKey === '') {
            if (app()->environment('production')) {
                Log::error('Transactional email delivery is unavailable because Resend is not configured.');
                throw new EmailDeliveryException('Transactional email delivery is unavailable.');
            }

            Log::info($content, ['recipient' => $recipient, 'delivery' => 'local-log']);

            return;
        }

        $fromEmail = trim((string) config('services.resend.from_email'));
        $fromName = trim((string) config('services.resend.from_name', 'PoiseAtHome'));

        if ($fromEmail === '') {
            Log::error('Transactional email delivery is unavailable because the Resend sender is not configured.');
            throw new EmailDeliveryException('Transactional email delivery is unavailable.');
        }

        try {
            $response = Http::acceptJson()
                ->withToken($apiKey)
                ->timeout(10)
                ->post('https://api.resend.com/emails', [
                    'from' => sprintf('%s <%s>', $fromName, $fromEmail),
                    'to' => [$recipient],
                    'subject' => $subject,
                    'text' => $content,
                ]);
        } catch (ConnectionException $exception) {
            Log::warning('Resend email request failed to connect.', ['exception' => $exception::class]);
            throw new EmailDeliveryException('Transactional email delivery failed.', previous: $exception);
        }

        if (! $response->successful() || ! is_string($response->json('id'))) {
            Log::warning('Resend email request was rejected.', ['status' => $response->status()]);
            throw new EmailDeliveryException('Transactional email delivery failed.');
        }
    }
}
