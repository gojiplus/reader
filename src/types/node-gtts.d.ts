declare module 'node-gtts' {
  interface GTTSOptions {
    lang?: string;
    slow?: boolean;
    host?: string;
  }

  class GTTS {
    constructor(text: string, options?: GTTSOptions);
    save(filename: string, callback: (err: Error | null) => void): void;
    stream(): NodeJS.ReadableStream;
  }

  export = GTTS;
}
