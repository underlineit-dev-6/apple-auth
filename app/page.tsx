import Image from "next/image";
import { FaApple } from "react-icons/fa";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white">
        <FaApple size={20} />
        Sign in with Apple
      </button>
    </div>
  );
}
