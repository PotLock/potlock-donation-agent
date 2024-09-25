'use client'

export const Projects = ({ props: { data } }: { props: any }) => {
    return (
        <div className="-mt-2 flex w-full flex-col gap-2 py-4">
            {data.map((project: any) => (
                <div
                    key={project.index}
                    className="flex shrink-0 flex-col gap-1 rounded-lg bg-zinc-800 p-4"
                >
                    <img className="object-fill" src={data.backgroundImage} />
                    <div className="text-sm text-zinc-400">

                    </div>
                    <div className="text-base font-bold text-zinc-200">
                        {project.name}
                    </div>
                    <div className="text-zinc-500">
                        {project.description}
                    </div>
                </div>
            ))}
        </div>
    )
}
