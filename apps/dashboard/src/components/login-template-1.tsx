"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/client";
import { Icons } from "@gnd/ui/icons";
import { FaGoogle } from "react-icons/fa6";
import { cn } from "@gnd/ui/cn";

export function LoginTemplate1({ className = "" }: { className?: string }) {
    const [isPending, setIsPending] = useState(false);

    const handleGoogleLogin = async () => {
        setIsPending(true);
        try {
            await signInWithGoogle();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div
            className={cn(
                "relative flex flex-col h-screen w-full bg-black text-white overflow-hidden font-sans",
                className
            )}
        >
            {/* Top White Wavy Background */}
            <div className="absolute top-0 left-0 w-full h-[45vh] bg-white z-0" style={{ borderBottomLeftRadius: '50% 20%', borderBottomRightRadius: '50% 40%' }}>
                 {/* Better Wavy effect with SVG */}
                <svg 
                    className="absolute bottom-0 left-0 w-full translate-y-[99%] scale-x-110" 
                    viewBox="0 0 1440 320" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                    style={{ height: "15vh" }}
                >
                    <path 
                        d="M0,224L60,197.3C120,171,240,117,360,122.7C480,128,600,192,720,208C840,224,960,192,1080,165.3C1200,139,1320,117,1380,106.7L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" 
                        fill="white"
                    />
                </svg>
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col w-full h-full max-w-md mx-auto px-8 pt-12 pb-16">
                
                {/* Header (Logo) */}
                <div className="flex items-center justify-between w-full text-black">
                    <Icons.logo />
                </div>

                {/* Title */}
                <div className="flex flex-col items-center mt-[10vh] text-black">
                    <h1 className="text-[3.5rem] font-medium tracking-tight">
                        Sign In
                    </h1>
                </div>

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Login Action Area */}
                <div className="flex flex-col items-center w-full gap-8 mb-10">
                    <div className="flex flex-col w-full items-center gap-2">
                        <p className="text-zinc-500 text-sm font-medium mb-4">or Sign In with</p>
                        
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isPending}
                            className="group relative w-full rounded-[2rem] p-[2px] bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            <div className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-[#0A0A0A] px-6 py-4 transition-colors group-hover:bg-[#111111]">
                                {isPending ? (
                                    <Icons.spinner className="animate-spin size-6" />
                                ) : (
                                    <FaGoogle className="size-6 text-white" />
                                )}
                                <span className="font-semibold text-white text-lg">
                                    Sign in with Google
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
