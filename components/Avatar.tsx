import { avatarColor, initials } from "@/lib/constants";

export default function Avatar({
  id,
  name,
  size = 28,
}: {
  id: number;
  name: string;
  size?: number;
}) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: avatarColor(id),
      }}
    >
      {initials(name)}
    </span>
  );
}
