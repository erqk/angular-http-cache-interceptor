# Angular HTTP cache interceptor

## Playground

https://stackblitz.com/edit/stackblitz-starters-5anpgv?file=src%2Fmain.ts

## Usage

Add this interceptor in the `httpCacheInterceptor` provider. It must be put at the last one, to able to cache all the requests.

```tsx
...
bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withInterceptors([
	    ...
        httpCacheInterceptor({
          urlsNotToCache: ['/products/categories'],
          ttls: { 'https://dummyjson.com/products': 1000 },
          globalTTL: 3000,
        }),
      ])
    ),
  ],
});
```

There are 3 options available:

### `urlsNotToCache`

The URLs that you don't want it to be cached. Supports regex.

### `ttls`

The key value pairs to customize ttl of the specific URL. The priority is higher than `globalTTL`.

- The key must exclude query string, and always starts from the end of the URL.

#### Example


```ts
//  https://www.domaintesting.com/api/dataA/partA?query=foo

{
  ttls: {
    '/api/dataA/partA': 10000,
    ...
  }
}
```

### `globalTTL`

The global ttl to all the URLs.

## Angular version < 15

The interceptor is a functional interceptor, which is introduced after Angular 15. Modify the code to use it in the Angluar version below 15.
