export default function TipList({ tips }) {
  if (tips.length === 0) {
    return <p className="text-sm text-sub py-6 text-center">영상에서 찾은 팁이 없어요.</p>;
  }
  return (
    <ul className="list-none m-0 mt-3 p-0 flex flex-col gap-2.5">
      {tips.map((tip, i) => (
        <li key={i} className="relative bg-main-soft rounded-2xl py-3.5 pr-3.5 pl-10 text-sm">
          <span className="absolute left-3 top-3.5 w-[18px] h-[18px] rounded-full bg-main text-white text-xs font-black grid place-items-center">
            !
          </span>
          {tip}
        </li>
      ))}
    </ul>
  );
}
