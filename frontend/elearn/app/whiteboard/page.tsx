"use client"
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
	return (
        <div className="relative w-fll h-screen">

            <div style={{ position: 'fixed', inset: 0 }}>
                <Tldraw />
            </div>
        </div>
	)
}
