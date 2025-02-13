import { AtpAgent } from '@atproto/api';
import * as dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as process from 'process';

dotenv.config();

const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

async function main() {
    try {
        await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD!})
        await agent.post({
        text: "Hello World"
        });
        console.log("Just posted!");
    } catch (error) {
        console.log(error);
    }
}

main();
