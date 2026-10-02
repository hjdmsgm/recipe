import { scaleQuantity, formatQuantity } from "@/lib/format";

function groupBy(ingredients) {
  const order = [];
  const map = new Map();
  for (const ing of ingredients) {
    const key = ing.group || "";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key).push(ing);
  }
  return order.map((key) => ({ label: key || null, items: map.get(key) }));
}

function displayAmount(ing, baseServings, servings) {
  if (ing.quantity == null) return ing.unit || "";
  const scaled = scaleQuantity(ing.quantity, baseServings, servings);
  return `${formatQuantity(scaled)}${ing.unit}`;
}

export default function IngredientList({ ingredients, baseServings, servings }) {
  const groups = groupBy(ingredients);
  const changed = servings !== baseServings;

  if (ingredients.length === 0) {
    return <p className="text-sm text-sub py-6 text-center">재료 정보를 찾지 못했어요.</p>;
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label || "__default__"}>
          {group.label && <p className="text-[13px] font-bold text-sub mt-4 mb-1">{group.label}</p>}
          <ul className="list-none m-0 p-0">
            {group.items.map((ing) => (
              <li key={ing.id} className="flex items-center gap-3 py-[11px] border-b border-line last:border-0">
                <span className="w-2 h-2 rounded-full bg-main/50 flex-none" />
                <span className="flex-1">
                  {ing.name}
                  {ing.note && <small className="block text-sub text-xs">{ing.note}</small>}
                </span>
                <span className={`font-bold tabular-nums whitespace-nowrap ${changed && ing.quantity != null ? "text-main" : ""}`}>
                  {displayAmount(ing, baseServings, servings)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
