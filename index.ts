import { twitterClient } from "./twitterClient";

const tweet = async () => {
  try {
    await twitterClient.v2.tweet("TEXT");
  } catch (e:any) {
    if(e.data) {
        console.log(e.data.detail)
    } else {
        console.error(e);
    }
  }
};

tweet();
