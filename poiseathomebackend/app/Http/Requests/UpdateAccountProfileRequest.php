<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('contact_number') && $this->contact_number !== null && $this->contact_number !== '') {
            $this->merge(['contact_number' => preg_replace('/[\s\-]/', '', (string) $this->contact_number)]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'regex:/^(09\d{9}|\+639\d{9})$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'contact_number.regex' => 'The contact number must be a valid Philippine mobile number (e.g. 09123456789 or +639123456789).',
        ];
    }
}
