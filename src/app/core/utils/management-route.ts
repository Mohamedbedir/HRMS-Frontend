import { Router } from '@angular/router';

export function managementRoutePrefix(router: Router): '/admin' | '/hr' {
  return router.url === '/hr' || router.url.startsWith('/hr/') ? '/hr' : '/admin';
}
