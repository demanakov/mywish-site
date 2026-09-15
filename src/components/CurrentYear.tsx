"use client";
import { useEffect, useState } from "react";
export default function CurrentYear() { const [year, setYear] = useState(2026); useEffect(() => { const update = () => setYear(Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Moscow", year: "numeric" }).format(new Date()))); update(); window.addEventListener("focus", update); const timer = setInterval(update, 60000); return () => { window.removeEventListener("focus", update); clearInterval(timer); }; }, []); return year; }
