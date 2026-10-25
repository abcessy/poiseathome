<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(fn () => null);
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->statefulApi();
        $middleware->append(\App\Http\Middleware\SecurityHeadersMiddleware::class);
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                if ($e instanceof ValidationException) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Validation failed.',
                        'errors' => $e->errors(),
                    ], 422);
                }

                if ($e instanceof AuthenticationException) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Unauthenticated.',
                    ], 401);
                }

                $statusCode = 500;
                if ($e instanceof HttpExceptionInterface) {
                    $statusCode = $e->getStatusCode();
                }

                $cleanMessage = match ($statusCode) {
                    400 => 'Bad request.',
                    401 => 'Unauthenticated.',
                    403 => 'Unauthorized action.',
                    404 => 'Resource not found.',
                    405 => 'Method not allowed.',
                    419 => 'Page expired or CSRF token mismatch.',
                    422 => 'Unprocessable entity.',
                    429 => 'Too many requests.',
                    default => 'An unexpected internal server error occurred.',
                };

                return response()->json([
                    'status' => 'error',
                    'message' => $cleanMessage,
                ], $statusCode);
            }
        });
    })->create();
