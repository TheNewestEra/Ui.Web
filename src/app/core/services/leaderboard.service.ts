import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaderboardResponse } from '@core/models/leaderboard-response.interface';

const URL = 'https://api.leaderboard.ryanb.co.za/api';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private readonly http = inject(HttpClient);

  getLeaderboard(): Observable<LeaderboardResponse> {
    // TODO: use the query parameters for kind and period
    return this.http.get<LeaderboardResponse>(URL + '/leaderboard');
  }
}
