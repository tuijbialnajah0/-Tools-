import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  QrCode, 
  Link as LinkIcon, 
  Type, 
  Mail, 
  Phone, 
  Wifi, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  AlertCircle,
  Lock,
  CheckCircle2,
  Settings2,
  MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { executeTool } from "../lib/toolService";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

type QrType = "url" | "text" | "email" | "phone" | "wifi" | "whatsapp";

export function QrGenerator() {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [toolId, setToolId] = useState<string | null>(null);
  const [creditCost, setCreditCost] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  // QR Content State
  const [qrType, setQrType] = useState<QrType>("url");
  const [url, setUrl] = useState("https://example.com");
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [phone, setPhone] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState("WPA");
  const [hidden, setHidden] = useState(false);

  // WhatsApp State
  const [waType, setWaType] = useState<"contact" | "group">("contact");
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waGroupUrl, setWaGroupUrl] = useState("");

  // QR Customization State
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(2);

  useEffect(() => {
    const fetchToolId = async () => {
      try {
        const toolsRef = collection(db, "tools");
        const q = query(toolsRef, where("tool_name", "==", "QR Code Generator"), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setToolId(doc.id);
          if (doc.data().credit_cost !== undefined) {
            setCreditCost(doc.data().credit_cost);
          }
        }
      } catch (err) {
        console.error("Error fetching tool data:", err);
      }
    };
    fetchToolId();
  }, []);

  // Reset payment state when content changes significantly
  useEffect(() => {
    setHasPaid(false);
  }, [qrType, url, text, email, phone, ssid, waType, waPhone, waMessage, waGroupUrl]);

  const getQrValue = () => {
    switch (qrType) {
      case "url":
        return url || "https://example.com";
      case "text":
        return text || "Enter some text";
      case "email":
        return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      case "phone":
        return `tel:${phone}`;
      case "wifi":
        return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden ? "true" : "false"};;`;
      case "whatsapp":
        if (waType === "contact") {
          const cleanPhone = waPhone.replace(/[^0-9]/g, '');
          return `https://wa.me/${cleanPhone}${waMessage ? `?text=${encodeURIComponent(waMessage)}` : ''}`;
        } else {
          return waGroupUrl || "https://chat.whatsapp.com/";
        }
      default:
        return "https://example.com";
    }
  };

  const handleUnlock = async () => {
    const isAdmin = user?.role === "admin";
    if (!isAdmin && user && user.credit_balance < creditCost) {
      setError("Insufficient credits to generate this QR code.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Deduct credits
      if (toolId && user) {
        await executeTool(user.id, toolId, creditCost);
      }

      if (user && !isAdmin) {
        updateUser({ 
          credit_balance: user.credit_balance - creditCost,
          total_spent: (user.total_spent || 0) + creditCost
        });
      }
      setHasPaid(true);
    } catch (err) {
      console.error(err);
      setError("Failed to process payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPNG = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `qrcode-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const downloadSVG = () => {
    const svg = document.getElementById("qr-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      let downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `qrcode-${Date.now()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    }
  };

  const handleClear = () => {
    setUrl("");
    setText("");
    setEmail("");
    setSubject("");
    setBody("");
    setPhone("");
    setSsid("");
    setPassword("");
    setWaPhone("");
    setWaMessage("");
    setWaGroupUrl("");
    setHasPaid(false);
    setError(null);
  };

  const qrValue = getQrValue();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link 
            to="/" 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              QR Code Generator
              <QrCode className="w-6 h-6 ml-2 text-indigo-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Instantly create custom QR codes offline</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Cost:</span>
          <div className="flex items-center ml-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <span className="mr-1">💳</span>
            {creditCost} Credits
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Type Selector */}
          <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
            {[
              { id: "url", icon: LinkIcon, label: "URL" },
              { id: "text", icon: Type, label: "Text" },
              { id: "email", icon: Mail, label: "Email" },
              { id: "phone", icon: Phone, label: "Phone" },
              { id: "wifi", icon: Wifi, label: "WiFi" },
              { id: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setQrType(type.id as QrType)}
                className={`flex-1 min-w-[100px] flex items-center justify-center py-3 px-4 rounded-xl font-semibold transition-all ${
                  qrType === type.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <type.icon className="w-4 h-4 mr-2" />
                {type.label}
              </button>
            ))}
          </div>

          {/* Input Fields */}
          <motion.div 
            key={qrType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Content</h3>
              <button 
                onClick={handleClear}
                className="text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Clear
              </button>
            </div>

            {qrType === "url" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            )}

            {qrType === "text" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custom Text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter your text here..."
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </div>
            )}

            {qrType === "email" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email Subject"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {qrType === "phone" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            )}

            {qrType === "wifi" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Network Name (SSID)</label>
                  <input
                    type="text"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    placeholder="My WiFi Network"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Network Password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Encryption</label>
                    <select
                      value={encryption}
                      onChange={(e) => setEncryption(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </div>
                  <div className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      id="hidden-wifi"
                      checked={hidden}
                      onChange={(e) => setHidden(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="hidden-wifi" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Hidden Network
                    </label>
                  </div>
                </div>
              </div>
            )}

            {qrType === "whatsapp" && (
              <div className="space-y-4">
                <div className="flex space-x-6 mb-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={waType === "contact"} 
                      onChange={() => setWaType("contact")}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Direct Message</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={waType === "group"} 
                      onChange={() => setWaType("group")}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Group Invite</span>
                  </label>
                </div>

                {waType === "contact" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number (with country code)</label>
                      <input
                        type="tel"
                        value={waPhone}
                        onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="e.g. 12345678900"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pre-filled Message (Optional)</label>
                      <textarea
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        placeholder="Hello! I would like to..."
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group Invite Link</label>
                    <input
                      type="url"
                      value={waGroupUrl}
                      onChange={(e) => setWaGroupUrl(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Customization */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center">
              <Settings2 className="w-5 h-5 mr-2 text-slate-500" /> Customization
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Foreground Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={fgColor} 
                    onChange={(e) => setFgColor(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Background Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Size</span>
                  <span className="text-slate-500">{size}px</span>
                </div>
                <input 
                  type="range" 
                  min="128" 
                  max="1024" 
                  step="32"
                  value={size} 
                  onChange={(e) => setSize(parseInt(e.target.value))} 
                  className="w-full accent-indigo-600" 
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Margin</span>
                  <span className="text-slate-500">{margin} blocks</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="1"
                  value={margin} 
                  onChange={(e) => setMargin(parseInt(e.target.value))} 
                  className="w-full accent-indigo-600" 
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview & Download */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sticky top-8 flex flex-col items-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-6 w-full text-center">Live Preview</h3>
            
            <div className="relative w-full aspect-square flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-8 p-4">
              <div className={`transition-all duration-300 ${!hasPaid ? "blur-[6px] opacity-60 scale-95" : "scale-100"}`}>
                {/* We render both Canvas and SVG invisibly/visibly to support both downloads */}
                <div className="hidden">
                  <QRCodeSVG
                    id="qr-svg"
                    value={qrValue}
                    size={size}
                    fgColor={fgColor}
                    bgColor={bgColor}
                    marginSize={margin}
                    level="H"
                  />
                </div>
                <QRCodeCanvas
                  id="qr-canvas"
                  value={qrValue}
                  size={240} // Fixed preview size
                  fgColor={fgColor}
                  bgColor={bgColor}
                  marginSize={margin}
                  level="H"
                  style={{ width: '100%', height: 'auto', maxWidth: '240px', borderRadius: '8px' }}
                />
              </div>

              {!hasPaid && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-[2px] z-10">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl mb-4">
                    <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white px-4 py-1 bg-white/80 dark:bg-black/50 rounded-full backdrop-blur-md">
                    Preview Mode
                  </span>
                </div>
              )}
            </div>

            <div className="w-full space-y-4">
              {!hasPaid ? (
                <>
                  <div className="flex items-center justify-between text-sm px-2 mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Unlock Cost</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center">
                      <span className="mr-1">💳</span>
                      {creditCost} Credits
                    </span>
                  </div>
                  <button 
                    onClick={handleUnlock}
                    disabled={isProcessing}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                  >
                    {isProcessing ? "Processing..." : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Unlock High-Res Downloads
                      </>
                    )}
                  </button>
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
                    Unlocks unlimited downloads for this specific QR code.
                  </p>
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold px-4 py-3 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Unlocked
                  </div>
                  <button 
                    onClick={downloadPNG}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PNG
                  </button>
                  <button 
                    onClick={downloadSVG}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download SVG
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
