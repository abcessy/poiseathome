<?php

namespace App\Providers;

use App\Contracts\TransactionalEmailService;
use App\Services\Email\BrevoEmailService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(TransactionalEmailService::class, BrevoEmailService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
