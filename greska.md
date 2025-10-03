Error fetching expiration notifications: PrismaClientKnownRequestError: 
Invalid `prisma.expirationNotification.findMany()` invocation in
/Users/emir_mw/avioservis/backend/src/controllers/expirationNotification.controller.ts:78:63

  75   where.isActive = validatedQuery.isActive;
  76 }
  77 
→ 78 const notifications = await prisma.expirationNotification.findMany(
Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 10, connection limit: 17)
    at Zn.handleRequestError (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:121:7459)
    at Zn.handleAndLogRequestError (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:121:6784)
    at Zn.request (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:121:6491)
    at async l (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:130:9778)
    at async getExpirationNotifications (/Users/emir_mw/avioservis/backend/src/controllers/expirationNotification.controller.ts:78:27) {
  code: 'P2024',
  meta: {
    modelName: 'ExpirationNotification',
    connection_limit: 17,
    timeout: 10
  },
  clientVersion: '6.10.0'
}
Error fetching notification stats: PrismaClientKnownRequestError: 
Invalid `prisma.expirationNotification.groupBy()` invocation in
/Users/emir_mw/avioservis/backend/src/controllers/expirationNotification.controller.ts:206:55

  203 // Get notification statistics
  204 export const getNotificationStats = async (req: Request, res: Response): Promise<void> => {
  205   try {
→ 206     const stats = await prisma.expirationNotification.groupBy(
Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 10, connection limit: 17)
    at Zn.handleRequestError (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:121:7459)
    at Zn.handleAndLogRequestError (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:121:6784)
    at Zn.request (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:121:6491)
    at async l (/Users/emir_mw/avioservis/backend/node_modules/@prisma/client/runtime/library.js:130:9778)
    at async getNotificationStats (/Users/emir_mw/avioservis/backend/src/controllers/expirationNotification.controller.ts:206:19) {
  code: 'P2024',
  meta: {
    modelName: 'ExpirationNotification',
    connection_limit: 17,
    timeout: 10
  },
  clientVersion: '6.10.0'
}
