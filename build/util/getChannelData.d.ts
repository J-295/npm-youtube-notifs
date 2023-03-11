declare type Channel = {
    title: string;
    url: string;
    id: string;
    released: Date;
    videos: Array<Video>;
};
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
    channel: Omit<Channel, "videos">;
};
declare function getChannelData(channelId: string): Promise<Channel>;
export { getChannelData, Video };
