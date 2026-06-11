import Link from "next/link";

const Home = () => {
  return (
    <div className="flex items-center justify-center min-h-screen py-2">
        Click <Link href="/documents/123"><span className="text-blue-500 underline">&nbsp;here&nbsp;</span></Link> to view documents.
    </div>
  );
};

export default Home;