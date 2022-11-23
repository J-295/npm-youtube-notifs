declare type Video = {
    title: string;
    url: string;
    id: string;
    released: Date;
    description: string;
    width: number;
    height: number;
    thumb: {
        width: number;
        height: number;
        url: string;
    };
    channel: {
        title: string;
        url: string;
        id: string;
        released: Date;
    };
};
declare type Channel = {
    title: string;
    url: string;
    id: string;
    released: Date;
    videos: Array<Video>;
};
export default function (channelId: string): Promise<Channel>;
export {};
