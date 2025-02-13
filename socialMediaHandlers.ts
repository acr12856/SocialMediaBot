// Abstract class and Providers
export abstract class AbstractSocialMediaProvider {
    protected apiKey: string;
  
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
  
    abstract postTweet(content: string): Promise<string>;
    abstract replyToTweet(replyContent: string, parentId: string): Promise<string>;
  }
  
export class XProvider extends AbstractSocialMediaProvider {
    private twitterApiUrl = 'https://api.twitter.com/2/tweets';
  
    async postTweet(content: string): Promise<string> {
      const config: AxiosRequestConfig = {1
        method: 'POST',
        url: this.twitterApiUrl,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        data: { text: content },
      };
      const resp = await axios(config);
      return resp.data?.data?.id;
    }
  
    async replyToTweet(replyContent: string, parentId: string): Promise<string> {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: this.twitterApiUrl,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        data: {
          text: replyContent,
          reply: { in_reply_to_tweet_id: parentId },
        },
      };
      const resp = await axios(config);
      return resp.data?.data?.id;
    }
  }
  
  export class BlueSkyProvider extends AbstractSocialMediaProvider {
      private blueskyAgentUrl = 'https://bsky.social/xrpc';
      private sessionToken: string | null = null;
    
      private async ensureAuthenticated(): Promise<void> {
        if (this.sessionToken) return;
        const resp = await axios.post(`${this.blueskyAgentUrl}/com.atproto.server.createSession`, {
          identifier: process.env.BLUESKY_HANDLE,
          password: process.env.BLUESKY_PASSWORD
        });
        this.sessionToken = resp.data?.accessJwt;
      }
    
      private async createPost(text: string, replyParams?: { root: string; parent: string }): Promise<string> {
        await this.ensureAuthenticated();
        const now = new Date().toISOString();
        const userDid = process.env.BLUESKY_DID;
    
        const recordData: any = {
          $type: 'app.bsky.feed.post',
          text,
          createdAt: now
        };
        if (replyParams) {
          recordData.reply = {
            root: { cid: replyParams.root, uri: replyParams.root },
            parent: { cid: replyParams.parent, uri: replyParams.parent }
          };
        }
        const body = {
          collection: 'app.bsky.feed.post',
          repo: userDid,
          record: recordData
        };
        const headers = {
          Authorization: `Bearer ${this.sessionToken}`,
          'Content-Type': 'application/json'
        };
        const resp = await axios.post(`${this.blueskyAgentUrl}/com.atproto.repo.createRecord`, body, { headers });
        return resp.data?.uri;
      }
    
      // Implementation of the abstract methods
      async postTweet(content: string): Promise<string> {
        return this.createPost(content);
      }
    
      /*async replyToTweet(replyContent: string, parentId: string): Promise<string> {
        return this.createPost(replyContent, {
          root: parentId,
          parent: parentId
        });
      }*/
    }
    
  
  /*export class ThreadsProvider extends AbstractSocialMediaProvider {
      private threadsApiUrl = 'https://graph.facebook.com/v17.0';
    
      // Implementation of postTweet
      async postTweet(content: string): Promise<string> {
        const url = `${this.threadsApiUrl}/threads/posts`;
        const config: AxiosRequestConfig = {
          method: 'POST',
          url,
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            message: content,
            access_token: this.apiKey
          }
        };
        const resp = await axios(config);
        return resp.data?.id;
      }
    
      // Implementation of replyToTweet
      async replyToTweet(replyContent: string, parentId: string): Promise<string> {
        const url = `${this.threadsApiUrl}/threads/posts/${parentId}/replies`;
        const config: AxiosRequestConfig = {
          method: 'POST',
          url,
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            message: replyContent,
            access_token: this.apiKey
          }
        };
        const resp = await axios(config);
        return resp.data?.id;
      }
    }*/
    
  
  // Helper functions
  export async function getTweetsFromNexusAI(html: string): Promise<{ tweets: { content: string }[] }> {
    const nexusUrl = process.env.NEXUSAI_URL || 'http://localhost:5500/api/chat/';
    const token = process.env.NEXUSAI_API_KEY || '';
  
    const payload = {
      promptName: 'HTML-to-Tweets',
      messages: [
        {
          sender: 'system',
          content: 'You are an AI that transforms HTML into a series of tweets in JSON format.',
        },
        {
          sender: 'user',
          content: `Convert the following HTML content into JSON. The JSON format must match:
            {
              "tweets": [
                { "content": "..." },
                { "content": "..." }
              ]
            }
            The HTML content is:
            """${html}"""
          `,
        },
      ],
      forceJSON: true,
    };
  
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  
    const response = await axios.post(nexusUrl, payload, { headers });
    const aiMessages = response.data?.messages;
    const aiResponseContent = aiMessages?.find((msg: any) => msg.sender === 'assistant')?.content;
  
    if (!aiResponseContent) throw new Error('No response content from NexusGenAI');
    return JSON.parse(aiResponseContent);
  }
  
  export async function postTweetsInThread(
    provider: AbstractSocialMediaProvider,
    tweets: { content: string }[],
    minDelayMs: number,
    maxDelayMs: number
  ): Promise<void> {
    if (!tweets.length) return;
    let parentPostId = await provider.postTweet(tweets[0].content);
    for (let i = 1; i < tweets.length; i++) {
      const delay = randomInt(minDelayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
      parentPostId = await provider.replyToTweet(tweets[i].content, parentPostId);
    }
  }