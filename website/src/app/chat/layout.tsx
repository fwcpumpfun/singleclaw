import HomeHeader from "@/components/HomeHeader";

export const metadata = {
  title: "Chat — SingleClaw",
  description: "Talk to CLAW, the autonomous agent managing the token.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HomeHeader />
      {children}
    </>
  );
}
