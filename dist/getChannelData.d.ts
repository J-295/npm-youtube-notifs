type Channel = {
    title: string;
    url: string;
    id: string;
    released: Date;
    videos: Video[];
};
type Video = {
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
declare function getChannelData(channelId: string): Promise<Channel | null>;
export { getChannelData, Video };
