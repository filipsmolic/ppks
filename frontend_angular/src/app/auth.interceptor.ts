import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const skipAuthUrls = ['/auth/token', '/auth/register'];

  if (skipAuthUrls.some((url) => req.url.includes(url))) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned).pipe(catchError((error) => handleError(error, next)));
  }

  return next(req).pipe(catchError((error) => handleError(error, next)));
};

function handleError(error: any, next: any) {
  if (error.status === 401) {
    const router = error.router;
    router.navigate(['/login']);
  }
  return throwError(() => new Error(error.message || 'Unknown error occurred'));
}
