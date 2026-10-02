import Link from "next/link";

export default function RecipeCard({ recipe, variant = "grid" }) {
  const { videoId, title, thumbnail, servings, cookTimeMinutes, memo } = recipe;

  return (
    <Link
      href={`/recipe/${videoId}`}
      className={`block bg-surface rounded-2xl overflow-hidden text-left relative ${
        variant === "scroll" ? "flex-none w-[150px]" : "w-full"
      }`}
    >
      <div className="aspect-[4/3] bg-line relative">
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 grid place-items-center text-main">
        <svg className="w-4 h-4" fill="currentColor">
          <use href="#i-heart" />
        </svg>
      </span>
      <div className="px-3 pt-2.5 pb-3">
        <h3 className="m-0 mb-1 text-[15px] font-bold line-clamp-1">{title}</h3>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-sub text-[13px]">
          {servings != null && <span>{servings}인분</span>}
          {cookTimeMinutes != null && <span>{cookTimeMinutes}분</span>}
        </div>
        {memo && (
          <div className="text-[12px] text-main-deep mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {memo}
          </div>
        )}
      </div>
    </Link>
  );
}
