import {
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Subject, filter, finalize, of, tap } from 'rxjs';

const requests = new Map<
  string,
  {
    src: string;
    data: HttpResponse<any>;
    data$: Subject<HttpResponse<any>>;
    params?: any;
    ttl?: number;
  }
>();

interface CacheOptions {
  urlsNotToCache?: string[];
  ttls?: { [url: string]: number };
  globalTTL?: number;
}

export const httpCacheInterceptor = (options?: CacheOptions) => {
  const { urlsNotToCache = [] } = options ?? {};
  const fn: HttpInterceptorFn = (req, next) => {
    const key = getUniqueKey(req);
    const skipCache = urlsNotToCache.some((x) => new RegExp(x).test(req.url));

    const prevRequest = () => {
      return requests.get(key);
    };

    const prevReq = prevRequest();

    if (!skipCache) {
      if (prevReq) {
        const { data, data$, ttl } = prevReq;

        if (!data$.closed) {
          return prevReq.data$;
        }

        if (data && ttl && ttl > new Date().getTime()) {
          return of(prevReq.data);
        }

        prevReq.data$ = new Subject<any>();
      } else {
        requests.set(key, {
          src: req.url,
          data$: new Subject<HttpResponse<any>>(),
          data: new HttpResponse<any>(),
          params: req.body,
          ttl: getTTL(req.url, options),
        });
      }
    }

    return next(req).pipe(
      filter((x) => x instanceof HttpResponse),
      tap((x) => {
        const data = x as HttpResponse<any>;
        const r = prevRequest();
        if (!r) return;

        r.data = data;
        r.ttl = getTTL(req.url, options);
        !r.data$.closed && r.data$.next(data);
      }),
      finalize(() => {
        const r = prevRequest();
        r?.data$.complete();
        r?.data$.unsubscribe();
      }),
    );
  };

  return fn;
};

function getUniqueKey(req: HttpRequest<unknown>): string {
  const bodySorted = sortObjectByKeys(req.body);
  const key = `${req.method}_${
    req.url
  }_${req.params.toString()}_${JSON.stringify(bodySorted)}`;

  return key;
}

function sortObjectByKeys(obj: any): any {
  const keysSorted = Object.keys(obj  ?? '').sort();
  const objSorted = keysSorted.reduce((_obj, key) => {
    const val = obj[key];
    _obj[key] = typeof val === 'object' ? sortObjectByKeys(val) : val;
    
    return _obj;
  }, {} as any);

  return objSorted;
}

function getTTL(reqUrl: string, options?: CacheOptions): number {
  const { ttls, globalTTL } = options ?? {};

  const getCustomTTL = () => {
    const matchedKey = Object.keys(ttls ?? '').find((x) =>
      reqUrl.split('?')[0].endsWith(x),
    );

    if (!ttls || !matchedKey) {
      return null;
    }

    return ttls[matchedKey];
  };

  return new Date().getTime() + (getCustomTTL() || globalTTL || 0);
}
