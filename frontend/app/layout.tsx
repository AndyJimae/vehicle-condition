import Providers from "./providers";
import "./globals.css";

export const metadata = {
  title: "Vehicle Condition Assessment",
  description: "Secure vehicle condition evaluation using FHEVM",
  keywords: "FHEVM, vehicle condition, privacy-preserving",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <header className="bg-blue-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Vehicle Condition Assessment</h1>
            <p className="mt-2 text-blue-100">Privacy-preserving vehicle evaluation powered by FHEVM</p>
          </div>
        </header>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


