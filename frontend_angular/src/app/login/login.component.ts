import { Component } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 class="text-3xl font-bold mb-4 text-center">CrowdCast</h1>
        <h2 class="text-2xl font-bold mb-4 text-center">Login</h2>
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <input
            type="text"
            [(ngModel)]="username"
            name="username"
            placeholder="Username"
            class="w-full px-4 py-2 border rounded"
            required
          />
          <input
            type="password"
            [(ngModel)]="password"
            name="password"
            placeholder="Password"
            class="w-full px-4 py-2 border rounded"
            required
          />
          <button
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </form>
        <p class="mt-4 text-center text-sm">
          <a href="/register" class="text-blue-500 hover:underline">
            Dont have an account? Register
          </a>
        </p>
        <p *ngIf="error" class="mt-4 text-center text-red-600">{{ error }}</p>
      </div>
    </div>
  `,
  imports: [CommonModule, FormsModule],
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  onSubmit() {
    this.error = '';

    const body = new HttpParams()
      .set('username', this.username)
      .set('password', this.password)
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
          this.authService.setUserData(response.user_id, this.username);
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('Login failed:', err);
          this.error = 'Login failed!';
        },
      });
  }
}
