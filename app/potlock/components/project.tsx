"use client";

import { LocalContext } from "@/app/potlock/shared";
import { useContext } from "react";

export function Project(props: {
    content: {
        name: string;
        description: string;
        backgroundImage: string;
    };
}) {
    const onAction = useContext(LocalContext);
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
                <img className="rounded-t-lg" src={props.content.backgroundImage} alt="" />
            </a>
            <div className="p-5">
                <a href="#">
                    <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{props.content.name}</h5>
                </a>
                <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{props.content.description}</p>
                <button onClick={() => {
                    onAction(`Donate 0.1 near to ${props.content.name} `);
                }} className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                    Donate Now
                </button>
            </div>
        </div>
    );
}

