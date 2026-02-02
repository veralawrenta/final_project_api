import { connection } from "../../config/redis";


export class RedisService {
    getValue = async (key: string) => { // yang tersimpan dii redis hanya string
        return await connection.get(key)
    };

    setValue = async (key: string, value: string, ttl?:number) => {
        //ttl adalah time to live => expired
        if (ttl){
            return await connection.set(key, value, "EX", ttl);
        } else {
            return await connection.set(key,value);
        }
    };

    delValue = async (key: string) => {
        return await connection.del(key);
    };

    /**
     * Delete keys by prefix using SCAN (safer than KEYS).
     * Example prefix: "property:search:" will match "property:search:*"
     */
    delByPrefix = async (prefix: string) => {
        const match = `${prefix}*`;
        let cursor = "0";
        let deleted = 0;

        do {
            const [nextCursor, keys] = await connection.scan(cursor, "MATCH", match, "COUNT", 200);
            cursor = nextCursor;
            if (keys.length > 0) {
                deleted += await connection.del(...keys);
            }
        } while (cursor !== "0");

        return deleted;
    };
}