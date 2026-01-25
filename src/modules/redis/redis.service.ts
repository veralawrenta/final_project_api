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
}