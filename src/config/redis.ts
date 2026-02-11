import IORedis from "ioredis"

export const connection = new IORedis.default({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: 3,
})