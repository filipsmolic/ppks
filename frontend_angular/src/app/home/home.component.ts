import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <button
      (click)="logout()"
      class="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md transition"
    >
      Logout
    </button>
    <h1 class="text-3xl text-center font-bold mt-10">CrowdCast</h1>
    <div class="max-w-xl mx-auto p-6 mt-20 bg-white rounded-xl shadow-md">
      <h1 class="text-2xl font-bold mb-4">Hello {{ userName }}</h1>

      <div>
        <button
          (click)="createRoom()"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Create Room
        </button>
      </div>

      <div class="mt-6">
        <h2 class="text-xl font-semibold mb-2">🔗 Join a Room</h2>
        <form
          [formGroup]="joinRoomForm"
          (ngSubmit)="joinRoom()"
          class="space-y-3"
        >
          <input
            formControlName="roomCode"
            placeholder="Enter Room Code"
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-400"
          />
          <div
            *ngIf="
              joinRoomForm.controls['roomCode'].invalid &&
              joinRoomForm.controls['roomCode'].touched
            "
            class="text-red-500 text-sm"
          >
            Room Code must be 6 characters long.
          </div>
          <button
            type="submit"
            [disabled]="joinRoomForm.invalid"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
          >
            Join Room
          </button>
        </form>
      </div>

      <div class="mt-10">
        <h2 class="text-xl font-semibold mb-4">🏠 My Active Rooms</h2>

        <div *ngIf="myRooms.length === 0" class="text-gray-500">
          You haven't created any rooms yet.
        </div>

        <div
          *ngFor="let room of myRooms"
          class="flex items-center justify-between mb-3 p-3 rounded shadow-sm"
        >
          <div>
            <div class="font-semibold text-lg">
              Room Code: {{ room.room_code }}
            </div>
            <div class="text-sm text-gray-500">
              Created: {{ room.created_at | date : 'short' }}
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              *ngIf="room.status !== 1"
              (click)="joinCreatedRoom(room.room_code, room.created_by)"
              class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
            >
              Join
            </button>
            <button
              *ngIf="room.status !== 1"
              (click)="deactivateRoom(room.room_id)"
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Deactivate
            </button>
            <button
              *ngIf="room.status === 1"
              (click)="activateRoom(room.room_id)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Activate
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  joinRoomForm!: FormGroup;
  authService = inject(AuthService);

  userName: string | null = null;
  userId: string | null = null;

  myRooms: any[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.joinRoomForm = new FormGroup({
      roomCode: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
      ]),
    });

    this.authService.userName.subscribe((userName) => {
      this.userName = userName;
    });
    this.authService.userId.subscribe((userId) => {
      this.userId = userId;
    });

    this.fetchMyRooms();
  }

  logout(): void {
    this.authService.clearUserData();
    this.router.navigate(['/login']);
  }

  createRoom(): Promise<boolean> | undefined {
    return this.http
      .post<any>('http://localhost:8000/rooms/create', {})
      .toPromise()
      .then((response) => {
        if (response && response.room_code) {
          this.router.navigate([`/room/${response.room_code}/${this.userId}`]);
          return true;
        } else {
          alert('❌ Failed to create room.');
          return false;
        }
      })
      .catch((error) => {
        alert(
          '❌ Failed to create room: ' + (error?.message || 'Unknown error')
        );
        return false;
      });
  }

  joinRoom() {
    if (this.joinRoomForm.invalid) return;

    const roomCode = this.joinRoomForm.value.roomCode;

    this.http.get<any>(`http://localhost:8000/rooms/${roomCode}`).subscribe({
      next: (response) => {
        if (response && response.status === 0) {
          console.log('Room is open:', response);
          this.router.navigate([`/room/${roomCode}/${response.created_by}`]);
          console.log('Navigating to room:', roomCode);
        } else {
          alert('❌ Room is closed or invalid.');
        }
      },
      error: (error) => {
        alert('❌ Failed to join room: ' + (error?.message || 'Unknown error'));
      },
    });
  }

  fetchMyRooms(): void {
    this.http
      .get<any[]>(`http://localhost:8000/rooms/created/myrooms`)
      .subscribe({
        next: (rooms) => {
          this.myRooms = rooms;
          console.log('My Rooms:', this.myRooms);
        },
        error: (error) => {
          console.error('Failed to fetch rooms', error);
          this.myRooms = [];
        },
      });
  }

  deactivateRoom(roomId: string): void {
    this.http
      .put(`http://localhost:8000/rooms/deactivate/${roomId}`, {})
      .subscribe({
        next: () => {
          this.myRooms = this.myRooms.map((room) =>
            room.room_id === roomId ? { ...room, status: 1 } : room
          );
        },
        error: (error) => {
          alert(
            '❌ Failed to deactivate room: ' + (error?.message || 'Unknown')
          );
        },
      });
  }

  activateRoom(roomId: string): void {
    this.http
      .put(`http://localhost:8000/rooms/activate/${roomId}`, {})
      .subscribe({
        next: () => {
          this.myRooms = this.myRooms.map((room) =>
            room.room_id === roomId ? { ...room, status: 0 } : room
          );
        },
        error: (error) => {
          alert('❌ Failed to activate room: ' + (error?.message || 'Unknown'));
        },
      });
  }

  joinCreatedRoom(roomCode: string, creatorId: string): void {
    this.router.navigate([`/room/${roomCode}/${creatorId}`]);
  }
}
