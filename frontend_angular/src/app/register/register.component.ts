import { Component } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 class="text-3xl font-bold mb-4 text-center">CrowdCast</h1>
        <h2 class="text-2xl font-bold mb-4 text-center">Register</h2>
        <form
          [formGroup]="registerForm"
          (ngSubmit)="onSubmit()"
          class="space-y-4"
        >
          <input
            type="text"
            formControlName="username"
            placeholder="Username"
            class="w-full px-4 py-2 border rounded"
          />
          <div
            *ngIf="
              registerForm.controls.username.touched &&
              registerForm.controls.username.invalid
            "
            class="text-red-500 text-sm"
          >
            Username is required.
          </div>

          <input
            type="password"
            formControlName="password"
            placeholder="Password"
            class="w-full px-4 py-2 border rounded"
          />
          <div
            *ngIf="
              registerForm.controls.password.touched &&
              registerForm.controls.password.invalid
            "
            class="text-red-500 text-sm"
          >
            Password is required and must be at least 6 characters.
          </div>

          <input
            type="password"
            formControlName="repeatPassword"
            placeholder="Repeat password"
            class="w-full px-4 py-2 border rounded"
          />
          <div *ngIf="passwordsMismatch" class="text-red-500 text-sm">
            Passwords do not match.
          </div>

          <button
            type="submit"
            [disabled]="registerForm.invalid || passwordsMismatch"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Register
          </button>
        </form>
        <p class="mt-4 text-center text-sm">
          <a href="/login" class="text-blue-500 hover:underline">
            Already have an account? Login
          </a>
        </p>
        <p *ngIf="error" class="mt-4 text-center text-red-600">{{ error }}</p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  error = '';

  registerForm: FormGroup<{
    username: FormControl<string>;
    password: FormControl<string>;
    repeatPassword: FormControl<string>;
  }>;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      password: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      repeatPassword: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  get passwordsMismatch(): boolean {
    return (
      this.registerForm.controls.password.value !==
      this.registerForm.controls.repeatPassword.value
    );
  }

  onSubmit() {
    if (this.registerForm.invalid || this.passwordsMismatch) return;

    const { username, password } = this.registerForm.getRawValue();
    this.error = '';

    this.http
      .post<any>('http://localhost:8000/auth/register', {
        username,
        password,
      })
      .subscribe({
        next: () => {
          const body = new HttpParams()
            .set('username', username)
            .set('password', password)
            .set('grant_type', 'password');

          const headers = new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
          });

          this.http
            .post<any>('http://localhost:8000/auth/token', body.toString(), {
              headers,
            })
            .subscribe({
              next: (response) => {
                localStorage.setItem('access_token', response.access_token);
                this.router.navigate(['/home']);
              },
              error: (err) => {
                console.error('Login failed:', err);
                this.error = 'Login failed after registration!';
              },
            });
        },
        error: (err) => {
          console.error('Registration failed:', err);
          this.error = err?.error?.message || 'Registration failed!';
        },
      });
  }
}
