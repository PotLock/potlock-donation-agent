
export default function Home() {

  return (
    <div className="p-4 md:p-8 rounded bg-[#25252d] w-full max-h-[85%] overflow-hidden">
      <h1 className="text-3xl md:text-4xl mb-4">
        Agent List
      </h1>
      <ul>
        <li className="text-l">
          🤝
          <span className="ml-2">
           
            <a href="/potlock">
              Potlock
            </a>
          </span>
        </li>
      </ul>
    </div>
  );
}
