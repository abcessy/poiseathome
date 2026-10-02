<?php

namespace App\Contracts;

interface TransactionalEmailService
{
    public function send(string $recipient, string $subject, string $content): void;
}
