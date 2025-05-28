import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-voting-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <button
      (click)="leaveRoom()"
      class="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md transition"
    >
      Leave
    </button>
    <div
      class="p-6 max-w-3xl mx-auto"
      style="font-family: 'Roboto', Arial, sans-serif;"
    >
      <h1 class="text-2xl font-bold mb-4">🗳️ Voting Room {{ roomCode }}</h1>
      <h2 class="text-xl mb-4">
        <span class="font-bold">Owner: </span>{{ createdByName }}
      </h2>
      <h2 class="text-xl mb-4">
        <span class="font-bold">Users joined: </span>{{ userCount$ | async }}
      </h2>

      @if (this.createdBy === this.userId && !this.showNewQuestionForm) {
      <div class="mb-4">
        <button
          (click)="toggleNewQuestionForm()"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          New Question
        </button>
      </div>
      }

      <div *ngIf="showNewQuestionForm" class="mb-6 bg-white p-4 rounded shadow">
        <form [formGroup]="newQuestionForm" (ngSubmit)="submitNewQuestion()">
          <div class="mb-4">
            <label for="title" class="block text-sm font-medium text-gray-700"
              >Title</label
            >
            <input
              id="title"
              formControlName="title"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-400"
              placeholder="Enter question title"
            />
            <div
              *ngIf="
                newQuestionForm.controls['title'].invalid &&
                newQuestionForm.controls['title'].touched
              "
              class="text-red-500 text-sm"
            >
              Title is required.
            </div>
          </div>

          <div class="mb-4">
            <label for="text" class="block text-sm font-medium text-gray-700"
              >Text</label
            >
            <textarea
              id="text"
              formControlName="text"
              rows="4"
              class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-400"
              placeholder="Enter question text"
            ></textarea>
            <div
              *ngIf="
                newQuestionForm.controls['text'].invalid &&
                newQuestionForm.controls['text'].touched
              "
              class="text-red-500 text-sm"
            >
              Text is required.
            </div>
          </div>
          <div class="flex justify-between">
            <button
              (click)="cancelQuestionForm()"
              class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              [disabled]="newQuestionForm.invalid"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              Submit Question
            </button>
          </div>
        </form>
      </div>

      <div *ngIf="questions.length > 0; else noQuestions">
        <div
          *ngFor="let q of questions"
          class="bg-white p-4 rounded shadow mb-4"
        >
          <h2 class="text-lg font-semibold">{{ q.question_title }}</h2>
          <p class="text-gray-700 mb-1">{{ q.question_text }}</p>
          <p class="text-sm text-gray-500 mb-5">
            Votes: {{ q.vote_count || 0 }}
          </p>
          @if (q.is_estimated) {
          <p class="text-sm text-gray-500">
            Estimated: <span class="font-bold">{{ q.estimate }} hours</span>
          </p>
          }

          <div
            *ngIf="
              userId !== createdBy &&
              !q.is_estimated &&
              !voteFormVisible[q.question_id] &&
              q.voted === false
            "
          >
            <button
              (click)="toggleVoteForm(q.question_id)"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Vote
            </button>
          </div>

          @if (q.voted && !q.is_estimated) {
          <p class="text-sm text-gray-500 mt-5">
            You have already voted on this question.
          </p>
          }

          <div
            *ngIf="userId === createdBy"
            class="mt-4 flex items-center justify-between"
          >
            <div *ngIf="!q.is_estimated">
              <button
                (click)="closeVote(q.question_id)"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Close Vote
              </button>
            </div>
            <div class="flex-1"></div>
            <button
              (click)="deleteQuestion(q.question_id)"
              class="ml-auto flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-red-100 rounded transition border border-gray-300"
            >
              <span class="material-symbols-outlined"> delete </span>
            </button>
          </div>

          <div *ngIf="voteFormVisible[q.question_id]" class="mt-4">
            <form
              [formGroup]="voteForms[q.question_id]"
              (ngSubmit)="submitVote(q.question_id)"
            >
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label
                    for="weeks"
                    class="block text-sm font-medium text-gray-700"
                    >Weeks</label
                  >
                  <input
                    id="weeks"
                    formControlName="weeks"
                    type="number"
                    class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label
                    for="days"
                    class="block text-sm font-medium text-gray-700"
                    >Days</label
                  >
                  <input
                    id="days"
                    formControlName="days"
                    type="number"
                    class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label
                    for="hours"
                    class="block text-sm font-medium text-gray-700"
                    >Hours</label
                  >
                  <input
                    id="hours"
                    formControlName="hours"
                    type="number"
                    class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-400"
                  />
                </div>
              </div>
              <div class="mt-4 flex justify-between">
                <button
                  (click)="cancelVoteForm(q.question_id)"
                  class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="voteForms[q.question_id].invalid"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                >
                  Submit Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ng-template #noQuestions>
        <p class="text-gray-500">No questions found in this room.</p>
      </ng-template>
    </div>
  `,
})
export class VotingRoomComponent implements OnInit {
  authService = inject(AuthService);

  ws: WebSocket | null = null;

  userName: string | null = null;
  userId: string | null = null;

  accessToken: string | null = '';
  questions: any[] = [];
  roomCode: string | null = '';
  createdBy: string | null = '';
  createdByName: string | null = '';

  voteFormVisible: { [key: string]: boolean } = {};
  voteForms: { [key: string]: FormGroup } = {};

  private userCountSubject = new BehaviorSubject<number>(0);
  userCount$ = this.userCountSubject.asObservable();

  showNewQuestionForm = false;
  newQuestionForm!: FormGroup;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.params.subscribe((params) => {
      this.roomCode = params['room_code'];
      this.createdBy = params['created_by'];
    });

    this.authService.userName.subscribe((userName) => {
      this.userName = userName;
    });
    this.authService.userId.subscribe((userId) => {
      this.userId = userId;
    });
  }

  ngOnInit(): void {
    this.fetchQuestions();
    this.fetchOwnerName();
    this.newQuestionForm = new FormGroup({
      title: new FormControl('', [Validators.required]),
      text: new FormControl('', [Validators.required]),
    });
    this.connectToWebSocket();
  }

  leaveRoom(): void {
    this.ws?.send(
      JSON.stringify({
        type: 'leave',
        user_id: this.userId,
      })
    );
    this.ws?.close();
    this.router.navigate(['/home']);
  }

  fetchOwnerName(): void {
    if (!this.createdBy) return;

    this.http
      .get<{ user_name: string }>(
        `http://localhost:8000/rooms/users/${this.createdBy}`
      )
      .subscribe({
        next: (data) => {
          this.createdByName = data.user_name;
        },
        error: (err) => {
          console.error('❌ Failed to fetch owner name:', err);
        },
      });
  }

  fetchQuestions(): void {
    this.http
      .get<any[]>(`http://localhost:8000/rooms/${this.roomCode}/questions`)
      .subscribe({
        next: (data) => {
          this.questions = data;
          this.initializeVoteForms();
          console.log('Fetched questions:', this.questions);
        },
        error: (err) => {
          console.error('Failed to fetch questions', err);
          this.questions = [];
        },
      });
  }

  initializeVoteForms(): void {
    this.questions.forEach((q) => {
      if (!this.voteForms[q.question_id]) {
        this.voteForms[q.question_id] = new FormGroup({
          weeks: new FormControl(0, [Validators.min(0)]),
          days: new FormControl(0, [Validators.min(0)]),
          hours: new FormControl(0, [Validators.min(0)]),
        });
        this.voteFormVisible[q.question_id] = false;
      }
    });
  }

  toggleVoteForm(questionId: string): void {
    this.voteFormVisible[questionId] = !this.voteFormVisible[questionId];
  }

  cancelVoteForm(questionId: string): void {
    this.voteFormVisible[questionId] = false;
    this.voteForms[questionId].reset({ weeks: 0, days: 0, hours: 0 });
  }

  toggleNewQuestionForm(): void {
    this.showNewQuestionForm = true;
  }

  cancelQuestionForm(): void {
    this.showNewQuestionForm = false;
    this.newQuestionForm.reset();
  }

  submitNewQuestion(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected.');
      return;
    }

    if (this.newQuestionForm.invalid) return;

    const newQuestion = this.newQuestionForm.value;

    const message = {
      type: 'new_question',
      title: newQuestion.title,
      text: newQuestion.text,
      user_id: this.userId,
    };

    this.ws.send(JSON.stringify(message));

    this.newQuestionForm.reset();
    this.showNewQuestionForm = false;
  }

  submitVote(questionId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected.');
      return;
    }

    const voteForm = this.voteForms[questionId];
    if (!voteForm) {
      console.error('Vote form not found for question:', questionId);
      return;
    }

    const { weeks, days, hours } = voteForm.value;
    const estimate = weeks * 7 * 24 + days * 24 + hours;

    const voteMessage = {
      type: 'vote',
      question_id: questionId,
      user_id: this.userId,
      estimate: estimate,
    };

    this.ws.send(JSON.stringify(voteMessage));

    const question = this.questions.find((q) => q.question_id === questionId);
    if (question) {
      question.voted = true;
    }

    voteForm.reset();
    this.voteFormVisible[questionId] = false;
  }

  closeVote(questionId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected.');
      return;
    }

    const closeVoteMessage = {
      type: 'close_vote',
      question_id: questionId,
    };

    this.ws.send(JSON.stringify(closeVoteMessage));
  }

  deleteQuestion(questionId: string): void {
    if (!confirm('Are you sure you want to delete this question?')) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      alert('WebSocket not connected.');
      return;
    }
    this.ws.send(
      JSON.stringify({
        type: 'delete_question',
        question_id: questionId,
        user_id: this.userId,
      })
    );
  }

  connectToWebSocket(): void {
    if (!this.roomCode) return;

    const wsUrl = `ws://localhost:8000/ws/${this.roomCode}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected to', this.roomCode);

      this.ws?.send(
        JSON.stringify({
          type: 'join',
          user_id: this.userId,
        })
      );
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📥 Incoming WebSocket message:', data);

      if (data.type === 'vote_update') {
        const question = this.questions.find(
          (q) => q.question_id === data.question_id
        );
        if (question) question.vote_count = (question.vote_count || 0) + 1;
      }

      if (data.type === 'user_joined' || data.type === 'user_left') {
        this.userCountSubject.next(data.count);
      }

      if (data.type === 'new_question') {
        this.questions.unshift(data.question);
        this.initializeVoteForms();
      }

      if (data.type === 'vote_closed') {
        const question = this.questions.find(
          (q) => q.question_id === data.question_id
        );
        if (question) {
          question.estimate = data.estimate;
          question.is_estimated = true;
        }
      }

      if (data.type === 'user_left') {
        this.userCountSubject.next(data.count);
      }

      if (data.type === 'question_deleted') {
        this.questions = this.questions.filter(
          (q) => q.question_id !== data.question_id
        );
      }
    };

    this.ws.onclose = () => {
      console.warn('❌ WebSocket disconnected');

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'leave',
            user_id: this.userId,
          })
        );
      }
    };

    window.addEventListener('beforeunload', () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'leave',
            user_id: this.userId,
          })
        );
      }
    });
  }
}
