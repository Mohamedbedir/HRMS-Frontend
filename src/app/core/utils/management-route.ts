import { Router } from '@angular/router';

export function managementRoutePrefix(router: Router): '/admin' | '/hr' | '/manager' {
  if (router.url === '/manager' || router.url.startsWith('/manager/')) {
    return '/manager';
  }

  return router.url === '/hr' || router.url.startsWith('/hr/') ? '/hr' : '/admin';
}
