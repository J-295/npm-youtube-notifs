type Channel = {
    name: string;
    url: string;
    id: string;
    created: Date;
    videos: Video[];
};
type Video = {
    title: string;
    url: string;
    id: string;
    created: Date;
    description: string;
    width: number;
    height: number;
    channel: {
        name: string;
        url: string;
        id: string;
        created: Date;
    };
    thumb: {
        width: number;
        height: number;
        url: string;
    };
};
declare function getChannelData(channelId: string): Promise<Channel | null>;
export { getChannelData, Video };
