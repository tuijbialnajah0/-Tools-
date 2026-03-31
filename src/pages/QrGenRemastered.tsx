import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Settings2,
  MessageCircle,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Layout,
  Check,
  X,
  Info,
  Plus,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

type QrType = "url" | "text" | "email" | "phone" | "wifi" | "whatsapp";

interface QrPreset {
  id: string;
  name: string;
  fgColor: string;
  bgColor: string;
  gradient?: boolean;
  gradientType?: "linear" | "radial";
  gradientColors?: [string, string];
  eyeColor?: string;
  description: string;
}

const PRESETS: QrPreset[] = [
  { id: "classic", name: "Classic Black", fgColor: "#000000", bgColor: "#ffffff", description: "Standard high-contrast QR code" },
  { id: "ocean", name: "Ocean Breeze", fgColor: "#0f172a", bgColor: "#f0f9ff", description: "Deep blue on light sky background" },
  { id: "sunset", name: "Sunset Glow", fgColor: "#7c2d12", bgColor: "#fff7ed", description: "Warm orange and brown tones" },
  { id: "forest", name: "Forest Deep", fgColor: "#064e3b", bgColor: "#f0fdf4", description: "Natural green aesthetic" },
  { id: "royal", name: "Royal Purple", fgColor: "#4c1d95", bgColor: "#f5f3ff", description: "Elegant purple theme" },
  { id: "neon", name: "Neon Cyber", fgColor: "#00ff41", bgColor: "#0d0d0d", description: "Matrix-style high tech look" },
  { id: "minimal", name: "Soft Minimal", fgColor: "#475569", bgColor: "#f8fafc", description: "Subtle gray for modern designs" },
  { id: "gold", name: "Luxury Gold", fgColor: "#854d0e", bgColor: "#fefce8", description: "Premium gold-themed code" },
];

export function QrGenRemastered() {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

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
  const [size, setSize] = useState(512);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(2);
  const [activePreset, setActivePreset] = useState("classic");
  
  // Logo State
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(20); // % of QR size
  const [excavate, setExcavate] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset generated state when content or customization changes
  useEffect(() => {
    setIsGenerated(false);
  }, [qrType, url, text, email, phone, ssid, waType, waPhone, waMessage, waGroupUrl, size, fgColor, bgColor, margin, logo, logoSize, excavate]);

  const applyPreset = (preset: QrPreset) => {
    setFgColor(preset.fgColor);
    setBgColor(preset.bgColor);
    setActivePreset(preset.id);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Logo size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getQrValue = () => {
    switch (qrType) {
      case "url":
        return url || "https://example.com";
      case "text":
        return text || "Sample Text";
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

  const downloadPNG = () => {
    const canvas = document.getElementById("qr-canvas-full") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `artistic-qr-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsGenerated(true);
      setIsProcessing(false);
    }, 800);
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
    setError(null);
    setIsGenerated(false);
  };

  const qrValue = getQrValue();

  const imageSettings = logo ? {
    src: logo,
    x: undefined,
    y: undefined,
    height: (size * logoSize) / 100,
    width: (size * logoSize) / 100,
    excavate: excavate,
  } : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              QR Code Gen<span className="text-indigo-600">~Remastered</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Create artistic, high-quality QR codes with custom logos</p>
          </div>
        </div>
        
        <Link 
          to="/qr-code-generator"
          className="flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Classic
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Content Type */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center">
                <Layout className="w-6 h-6 mr-3 text-indigo-500" />
                1. Select Content Type
              </h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
                  className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl font-bold transition-all border-2 ${
                    qrType === type.id
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                      : "bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                  }`}
                >
                  <type.icon className={`w-6 h-6 mb-2 ${qrType === type.id ? "text-white" : "text-slate-400"}`} />
                  <span className="text-xs uppercase tracking-widest">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={qrType}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  {qrType === "url" && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Website URL</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                      />
                    </div>
                  )}

                  {qrType === "text" && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Custom Text</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter your text here..."
                        rows={4}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all resize-none"
                      />
                    </div>
                  )}

                  {qrType === "email" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="hello@example.com"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Email Subject"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Message Body</label>
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          placeholder="Write your message..."
                          rows={3}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "phone" && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                      />
                    </div>
                  )}

                  {qrType === "wifi" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Network Name (SSID)</label>
                        <input
                          type="text"
                          value={ssid}
                          onChange={(e) => setSsid(e.target.value)}
                          placeholder="My WiFi Network"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Network Password"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Encryption</label>
                        <select
                          value={encryption}
                          onChange={(e) => setEncryption(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all appearance-none"
                        >
                          <option value="WPA">WPA/WPA2</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">None</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {qrType === "whatsapp" && (
                    <div className="space-y-4">
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                        <button 
                          onClick={() => setWaType("contact")}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${waType === "contact" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500"}`}
                        >
                          Direct Message
                        </button>
                        <button 
                          onClick={() => setWaType("group")}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${waType === "group" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500"}`}
                        >
                          Group Invite
                        </button>
                      </div>

                      {waType === "contact" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp Number (with country code)</label>
                            <input
                              type="tel"
                              value={waPhone}
                              onChange={(e) => setWaPhone(e.target.value)}
                              placeholder="e.g. 12345678900"
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pre-filled Message (Optional)</label>
                            <textarea
                              value={waMessage}
                              onChange={(e) => setWaMessage(e.target.value)}
                              placeholder="Hello! I would like to..."
                              rows={3}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all resize-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Group Invite Link</label>
                          <input
                            type="url"
                            value={waGroupUrl}
                            onChange={(e) => setWaGroupUrl(e.target.value)}
                            placeholder="https://chat.whatsapp.com/..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium outline-none transition-all"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Section 2: Artistic Presets */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center">
              <Palette className="w-6 h-6 mr-3 text-indigo-500" />
              2. Artistic Presets
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`group relative p-4 rounded-3xl border-2 transition-all text-left ${
                    activePreset === preset.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                  }`}
                >
                  <div 
                    className="w-full aspect-square rounded-xl mb-3 shadow-inner flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: preset.bgColor }}
                  >
                    <div 
                      className="w-1/2 h-1/2 rounded-md"
                      style={{ backgroundColor: preset.fgColor }}
                    />
                  </div>
                  <p className={`text-sm font-black tracking-tight ${activePreset === preset.id ? "text-indigo-600" : "text-slate-700 dark:text-slate-300"}`}>
                    {preset.name}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{preset.description}</p>
                  
                  {activePreset === preset.id && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Custom Logo & Advanced */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center">
              <ImageIcon className="w-6 h-6 mr-3 text-indigo-500" />
              3. Branding & Customization
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Logo Upload */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Center Logo</label>
                  {logo ? (
                    <div className="relative w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-indigo-500 p-4 group">
                      <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                      <button 
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all group"
                    >
                      <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Upload Logo</span>
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="mt-3 text-[10px] text-slate-500 font-medium">PNG or SVG recommended. Max 2MB.</p>
                </div>

                {logo && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                        <span>Logo Size</span>
                        <span className="text-indigo-600">{logoSize}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="35" 
                        value={logoSize} 
                        onChange={(e) => setLogoSize(parseInt(e.target.value))} 
                        className="w-full accent-indigo-600" 
                      />
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-10 h-6 rounded-full transition-colors relative ${excavate ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${excavate ? 'left-5' : 'left-1'}`} />
                      </div>
                      <input 
                        type="checkbox" 
                        checked={excavate} 
                        onChange={(e) => setExcavate(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Excavate (Clear background behind logo)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Color & Size */}
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Custom Foreground</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => {
                          setFgColor(e.target.value);
                          setActivePreset("custom");
                        }}
                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={fgColor} 
                        onChange={(e) => setFgColor(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-3 text-xs text-slate-900 dark:text-white uppercase font-black tracking-widest"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Custom Background</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => {
                          setBgColor(e.target.value);
                          setActivePreset("custom");
                        }}
                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-3 text-xs text-slate-900 dark:text-white uppercase font-black tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                    <span>Quiet Zone (Margin)</span>
                    <span className="text-indigo-600">{margin} blocks</span>
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

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start space-x-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                    Higher error correction (Level H) is automatically used to ensure scannability even with large center logos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Download (4 cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 w-full text-center uppercase tracking-widest">
                {isGenerated ? "Remastered QR" : "Live Preview"}
              </h3>
              
              <div className="relative w-full aspect-square flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden mb-8 p-8 group">
                {/* Decorative background for preview */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
                </div>

                <AnimatePresence mode="wait">
                  {isGenerated ? (
                    <motion.div 
                      key="generated"
                      initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      className="relative z-10 w-full h-full flex items-center justify-center"
                    >
                      {/* Full size canvas for download (hidden) */}
                      <div className="hidden">
                        <QRCodeCanvas
                          id="qr-canvas-full"
                          value={qrValue}
                          size={1024}
                          fgColor={fgColor}
                          bgColor={bgColor}
                          marginSize={margin}
                          level="H"
                          imageSettings={imageSettings}
                        />
                      </div>
                      
                      {/* Preview Canvas */}
                      <QRCodeCanvas
                        id="qr-canvas-preview"
                        value={qrValue}
                        size={280}
                        fgColor={fgColor}
                        bgColor={bgColor}
                        marginSize={margin}
                        level="H"
                        imageSettings={imageSettings}
                        style={{ width: '100%', height: 'auto', maxWidth: '280px', borderRadius: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 z-10"
                    >
                      <div className="w-24 h-24 border-4 border-dashed border-current rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                        <QrCode className="w-12 h-12" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-center px-8">
                        Ready to Remaster
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-full space-y-4">
                <button
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center shadow-xl ${
                    isGenerated 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02]" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20"
                  } disabled:opacity-70`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                      Remastering...
                    </>
                  ) : isGenerated ? (
                    <>
                      <RefreshCw className="w-6 h-6 mr-3" />
                      Update Design
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mr-3" />
                      Generate Artistic QR
                    </>
                  )}
                </button>

                {isGenerated && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-2"
                  >
                    <button 
                      onClick={downloadPNG}
                      className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center group"
                    >
                      <Download className="w-5 h-5 mr-3 group-hover:translate-y-0.5 transition-transform" />
                      Download High-Res PNG
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
                      1024x1024px • 300 DPI • Print Ready
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl" />
              
              <h4 className="text-lg font-black mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2" /> Pro Tips
              </h4>
              <ul className="space-y-3 text-xs font-medium text-indigo-100">
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 mr-2 flex-shrink-0" />
                  Use high contrast colors for better scannability.
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 mr-2 flex-shrink-0" />
                  Keep logos under 30% of the total QR area.
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 mr-2 flex-shrink-0" />
                  PNG logos with transparency work best.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
