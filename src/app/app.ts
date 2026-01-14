import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe],
  template: `
    <main class="main">
      <div class="container">
        <header class="header">
          <h1 class="title">{{ title() }}</h1>
          <p class="subtitle">Calculate how much salary is earned during idle time.</p>
        </header>

        @if (!setupComplete()) {
          <section class="grid single">
            <div class="card form-card">
              <h2 class="card-title">Setup</h2>
              <div class="form-group">
                <label class="label" for="salary">Monthly salary</label>
                <div class="input-group">
                  <span class="prefix">RM</span>
                  <input id="salary" class="input" type="number" min="0" step="0.01" [value]="monthlySalary()" (input)="onSalaryInput($event)" placeholder="e.g. 3000" />
                </div>
              </div>

              <div class="row">
                <div class="form-group">
                  <label class="label" for="days">Working days / month</label>
                  <input id="days" class="input" type="number" min="1" step="1" [value]="workingDaysPerMonth()" (input)="onDaysInput($event)" />
                </div>
                <div class="form-group">
                  <label class="label" for="hours">Working hours / day</label>
                  <input id="hours" class="input" type="number" min="1" step="0.5" [value]="workingHoursPerDay()" (input)="onHoursInput($event)" />
                </div>
              </div>

              <div class="actions">
                <button class="btn primary" (click)="completeSetup()" [disabled]="!canContinue()">Continue</button>
              </div>
            </div>
          </section>
        } @else {
          <section class="grid">
            <div class="card form-card">
              <h2 class="card-title">Idle time</h2>
              <div class="form-group">
                <label class="label" for="activity-desc">Description</label>
                <input id="activity-desc" class="input" type="text" [value]="currentDescription()" (input)="onDescInput($event)" placeholder="Idle" />
              </div>
              <div class="form-group">
                <label class="label">Duration</label>
                <input aria-label="Idle duration" class="input time-input" inputmode="numeric" pattern="[0-9:]*" [value]="formattedIdle()" (input)="onIdleTextInput($event)" placeholder="HH:MM:SS" />
                <div class="quick-actions">
                  <button class="btn chip" (click)="addIdleSeconds(60)">+1m</button>
                  <button class="btn chip" (click)="addIdleSeconds(300)">+5m</button>
                  <button class="btn chip" (click)="addIdleSeconds(900)">+15m</button>
                  <button class="btn chip" (click)="addIdleSeconds(3600)">+1h</button>
                  <button class="btn chip" (click)="clearIdle()">Clear</button>
                </div>
              </div>
              <div class="actions">
                <button class="btn primary" (click)="addActivity()" [disabled]="idleTotalSeconds()===0">Add activity</button>
              </div>
              <div class="actions">
                <button class="btn" (click)="backToSetup()">Back to setup</button>
              </div>
            </div>

            <div class="card results-card">
              <h2 class="card-title">Results</h2>
              <ul class="stats">
                <li class="stat"><span class="stat-label">Per hour</span><span class="stat-value">{{ (earningsPerSecond() * 3600) | currency:'MYR':'symbol':'1.2-2' }}</span></li>
                <li class="stat"><span class="stat-label">Per minute</span><span class="stat-value">{{ (earningsPerSecond() * 60) | currency:'MYR':'symbol':'1.2-2' }}</span></li>
                <li class="stat"><span class="stat-label">Per second</span><span class="stat-value">{{ earningsPerSecond() | currency:'MYR':'symbol':'1.4-4' }}</span></li>
              </ul>
              <div class="highlight">
                <div class="highlight-label">Idle earnings</div>
                <div class="highlight-value">{{ totalIdleEarnings() | currency:'MYR':'symbol':'1.2-2' }}</div>
              </div>
              @if (activities().length === 1) {
                <p class="summary">Today you have earned {{ totalIdleEarnings() | currency:'MYR':'symbol':'1.2-2' }} with {{ activities()[0].description }} {{ humanizeSeconds(totalIdleSecondsFromActivities()) }}.</p>
              } @else if (activities().length === 2) {
                <p class="summary">Today you have earned {{ totalIdleEarnings() | currency:'MYR':'symbol':'1.2-2' }} with {{ activities()[0].description }} and {{ activities()[1].description }} (total {{ humanizeSeconds(totalIdleSecondsFromActivities()) }}).</p>
              } @else {
                <p class="summary">Today you have earned {{ totalIdleEarnings() | currency:'MYR':'symbol':'1.2-2' }} across {{ activities().length }} activities (total {{ humanizeSeconds(totalIdleSecondsFromActivities()) }}).</p>
              }

              <div class="activity-list">
                @for (a of activities(); let i = $index; track i) {
                  <div class="activity-row">
                    <div class="activity-desc">{{ a.description }}</div>
                    <div class="activity-time">{{ formatSeconds(a.seconds) }}</div>
                    <div class="activity-value">{{ (earningsPerSecond() * a.seconds) | currency:'MYR':'symbol':'1.2-2' }}</div>
                    <button class="btn chip danger" aria-label="Remove" (click)="removeActivity(i)">Remove</button>
                  </div>
                }
                @if (activities().length === 0) {
                  <div class="activity-empty">No activities yet. Add one on the left.</div>
                }
              </div>
              @if (activities().length > 0) {
                <div class="actions">
                  <button class="btn" (click)="clearActivities()">Clear all</button>
                </div>
              }
            </div>
          </section>
        }
      </div>
    </main>
  `,
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Idle Salary Calculator');

  // Inputs
  protected readonly monthlySalary = signal<number>(0);
  protected readonly workingDaysPerMonth = signal<number>(26);
  protected readonly workingHoursPerDay = signal<number>(8);

  protected readonly idleHours = signal<number>(0);
  protected readonly idleMinutes = signal<number>(0);
  protected readonly idleSeconds = signal<number>(0);

  // Derived values
  protected readonly totalWorkingSecondsPerMonth = computed(() => {
    const days = this.workingDaysPerMonth() || 0;
    const hours = this.workingHoursPerDay() || 0;
    return days * hours * 3600;
  });

  protected readonly earningsPerSecond = computed(() => {
    const salary = this.monthlySalary() || 0;
    const totalSeconds = this.totalWorkingSecondsPerMonth();
    if (totalSeconds <= 0) return 0;
    return salary / totalSeconds;
  });

  protected readonly idleTotalSeconds = computed(() => {
    const h = Math.max(0, this.idleHours() || 0);
    const m = Math.max(0, this.idleMinutes() || 0);
    const s = Math.max(0, this.idleSeconds() || 0);
    return h * 3600 + m * 60 + s;
  });

  protected readonly idleEarnings = computed(() => {
    return this.earningsPerSecond() * this.idleTotalSeconds();
  });

  // Flow
  protected readonly setupComplete = signal<boolean>(false);
  protected readonly currentDescription = signal<string>('Idle');
  protected readonly activities = signal<{ description: string; seconds: number }[]>([]);
  protected readonly totalIdleSecondsFromActivities = computed(() => this.activities().reduce((acc, a) => acc + a.seconds, 0));
  protected readonly totalIdleEarnings = computed(() => this.earningsPerSecond() * this.totalIdleSecondsFromActivities());

  constructor() {
    // Load persisted values if present
    const persisted = localStorage.getItem('idle-salary:setup');
    if (persisted) {
      try {
        const data = JSON.parse(persisted) as { salary: number; days: number; hours: number };
        if (typeof data.salary === 'number') this.monthlySalary.set(Math.max(0, data.salary));
        if (typeof data.days === 'number') this.workingDaysPerMonth.set(Math.max(1, Math.floor(data.days)));
        if (typeof data.hours === 'number') this.workingHoursPerDay.set(Math.max(1, data.hours));
        this.setupComplete.set(true);
      } catch { /* ignore */ }
    }
    const act = localStorage.getItem('idle-salary:activities');
    if (act) {
      try {
        const list = JSON.parse(act) as { description: string; seconds: number }[];
        if (Array.isArray(list)) this.activities.set(list.filter(a => a && typeof a.description === 'string' && typeof a.seconds === 'number' && a.seconds >= 0));
      } catch { /* ignore */ }
    }
  }

  canContinue(): boolean {
    return this.monthlySalary() > 0 && this.workingDaysPerMonth() >= 1 && this.workingHoursPerDay() >= 1;
  }

  completeSetup(): void {
    if (!this.canContinue()) return;
    localStorage.setItem('idle-salary:setup', JSON.stringify({
      salary: this.monthlySalary(),
      days: this.workingDaysPerMonth(),
      hours: this.workingHoursPerDay()
    }));
    this.setupComplete.set(true);
  }

  backToSetup(): void {
    this.setupComplete.set(false);
  }

  onSalaryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = isNaN(input.valueAsNumber) ? 0 : Math.max(0, input.valueAsNumber);
    this.monthlySalary.set(value);
  }

  onDaysInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = isNaN(input.valueAsNumber) ? 26 : Math.max(1, Math.floor(input.valueAsNumber));
    this.workingDaysPerMonth.set(value);
  }

  onHoursInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = isNaN(input.valueAsNumber) ? 8 : Math.max(1, input.valueAsNumber);
    this.workingHoursPerDay.set(value);
  }

  onIdleHoursInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = isNaN(input.valueAsNumber) ? 0 : input.valueAsNumber;
    this.idleHours.set(Math.max(0, Math.floor(raw)));
  }

  onIdleMinutesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = isNaN(input.valueAsNumber) ? 0 : input.valueAsNumber;
    const clamped = Math.max(0, Math.min(59, Math.floor(raw)));
    this.idleMinutes.set(clamped);
  }

  onIdleSecondsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = isNaN(input.valueAsNumber) ? 0 : input.valueAsNumber;
    const clamped = Math.max(0, Math.min(59, Math.floor(raw)));
    this.idleSeconds.set(clamped);
  }

  // Duration text UX
  formattedIdle(): string {
    const total = this.idleTotalSeconds();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private setIdleFromTotalSeconds(total: number): void {
    const safe = Math.max(0, Math.floor(total));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    this.idleHours.set(h);
    this.idleMinutes.set(m);
    this.idleSeconds.set(s);
  }

  private parseDuration(text: string): number {
    if (!text) return 0;
    const t = text.trim();
    // Support tokens like "1h 20m 5s"
    const tokenMatch = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i.exec(t);
    if (tokenMatch && (tokenMatch[1] || tokenMatch[2] || tokenMatch[3])) {
      const h = parseInt(tokenMatch[1] || '0', 10);
      const m = parseInt(tokenMatch[2] || '0', 10);
      const s = parseInt(tokenMatch[3] || '0', 10);
      return h * 3600 + m * 60 + s;
    }
    // Support HH:MM:SS or MM:SS or SS
    const parts = t.split(':').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0 && parts.every(p => /^\d+$/.test(p))) {
      const nums = parts.map(p => parseInt(p, 10));
      let h = 0, m = 0, s = 0;
      if (nums.length === 3) { [h, m, s] = nums; }
      else if (nums.length === 2) { [m, s] = nums; }
      else { s = nums[0]; }
      return (h * 3600) + (m * 60) + s;
    }
    // Fallback: numbers only
    const onlyNum = parseInt(t.replace(/\D/g, ''), 10);
    return isNaN(onlyNum) ? 0 : onlyNum;
  }

  onIdleTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const seconds = this.parseDuration(input.value);
    this.setIdleFromTotalSeconds(seconds);
    // Normalize text to HH:MM:SS for consistent UX
    input.value = this.formattedIdle();
  }

  addIdleSeconds(delta: number): void {
    const next = this.idleTotalSeconds() + delta;
    this.setIdleFromTotalSeconds(next);
  }

  clearIdle(): void {
    this.setIdleFromTotalSeconds(0);
  }

  onDescInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentDescription.set(input.value ?? '');
  }

  addActivity(): void {
    const seconds = this.idleTotalSeconds();
    const description = this.currentDescription().trim() || 'Idle';
    if (seconds <= 0) return;
    const next = [...this.activities(), { description, seconds }];
    this.activities.set(next);
    localStorage.setItem('idle-salary:activities', JSON.stringify(next));
    // reset input
    this.currentDescription.set('Idle');
    this.clearIdle();
  }

  removeActivity(index: number): void {
    const list = [...this.activities()];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    this.activities.set(list);
    localStorage.setItem('idle-salary:activities', JSON.stringify(list));
  }

  clearActivities(): void {
    this.activities.set([]);
    localStorage.removeItem('idle-salary:activities');
  }

  formatSeconds(total: number): string {
    const t = Math.max(0, Math.floor(total));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  humanizeSeconds(total: number): string {
    const t = Math.max(0, Math.floor(total));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
    if (s > 0 && parts.length === 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
    return parts.join(' ');
  }
}
