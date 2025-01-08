import { useState, useRef, useEffect } from 'react';
import { Menu, Upload, Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import BarVisualizer from '@/components/visualizers/BarVisualizer';
import WaveVisualizer from '@/components/visualizers/WaveVisualizer';
import CircularVisualizer from '@/components/visualizers/CircularVisualizer';

const Index = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(128).fill(0));
  const [progress, setProgress] = useState(0);
  const [visualizerType, setVisualizerType] = useState<'bar' | 'wave' | 'circular'>('bar');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = url;
      setupAudioContext();
    }
  };

  const setupAudioContext = () => {
    if (!audioRef.current) return;

    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
    
    sourceRef.current.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateData = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      setAudioData(new Uint8Array(dataArray));
      
      if (audioRef.current) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateData);
    };

    updateData();
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const VisualizerComponent = {
    bar: BarVisualizer,
    wave: WaveVisualizer,
    circular: CircularVisualizer,
  }[visualizerType];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Sound Visualizer</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Visualization Settings</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <RadioGroup
                  value={visualizerType}
                  onValueChange={(value) => setVisualizerType(value as typeof visualizerType)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bar" id="bar" />
                    <Label htmlFor="bar">Bar Visualization</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wave" id="wave" />
                    <Label htmlFor="wave">Wave Visualization</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="circular" id="circular" />
                    <Label htmlFor="circular">Circular Visualization</Label>
                  </div>
                </RadioGroup>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content */}
        <div className="aspect-video bg-black/20 rounded-lg backdrop-blur-sm border border-white/10 overflow-hidden mb-8">
          <VisualizerComponent audioData={audioData} />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={togglePlayPause}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {isPlaying ? <Pause className="mr-2" /> : <Play className="mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="mr-2" />
              Upload Audio
            </Button>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <input
          type="file"
          id="file-upload"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
};

export default Index;