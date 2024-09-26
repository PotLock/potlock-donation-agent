'use client'

export const Pots = ({ props: { data } }: { props: any }) => {
    return (
        <div className="-mt-2 flex w-full flex-col gap-2 py-4">
            {data.map((pot: any, index: number) => (
                <div
                    key={index}
                    className="flex shrink-0 flex-col gap-1 rounded-lg bg-zinc-800 p-4"
                >
                    <div className="text-sm text-zinc-400">
                    </div>
                    <div className="text-base font-bold text-zinc-200">
                        {pot.name}
                    </div>
                    <div className="text-zinc-500">
                        {pot.description}
                    </div>
                </div>
            ))}
        </div>
    )
}
