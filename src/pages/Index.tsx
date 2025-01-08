import { useState, useRef, useEffect } from 'react';
import { Menu, Upload, Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import BarVisualizer from '@/components/visualizers/BarVisualizer';
import WaveVisualizer from '@/components/visualizers/WaveVisualizer';
import CircularVisualizer from '@/components/visualizers/CircularVisualizer';
import SpiralVisualizer from '@/components/visualizers/SpiralVisualizer';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const Index = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array>(
    new Uint8Array(128).fill(0)
  );
  const [progress, setProgress] = useState(0);
  const [visualizerType, setVisualizerType] = useState<
    'bar' | 'wave' | 'circular' | 'spiral'
  >('bar');
  const [currentAudioFile, setCurrentAudioFile] = useState<File | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          'text/javascript'
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          'application/wasm'
        ),
        workerURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.worker.js`,
          'text/javascript'
        ),
      });
      ffmpegRef.current = ffmpeg;
    };
    loadFFmpeg();
  }, []);

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

    setCurrentAudioFile(file);
    const url = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = url;
      setupAudioContext();
      toast.success('Audio file loaded successfully!');
    }
  };

  const handleDownload = async () => {
    if (!currentAudioFile) {
      toast.error('No audio file loaded!');
      return;
    }

    const canvasElement = document.querySelector('canvas')!;
    if (
      !(canvasElement instanceof HTMLCanvasElement) ||
      !audioRef.current ||
      !ffmpegRef.current
    ) {
      toast.error('Visualization not ready!');
      return;
    }

    const ffmpeg = ffmpegRef.current;

    try {
      const imageData = canvasElement.toDataURL('image/png');

      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);

      const video = document.createElement('video');
      video.width = canvasElement.width;
      video.height = canvasElement.height;

      const canvasStream = canvasElement.captureStream(30);
      const audioTracks = destination.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }

      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: 'video/webm' });

        await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
        await ffmpeg.exec(['-i', 'input.webm', '-c', 'copy', 'output.mp4']);
        const data = await ffmpeg.readFile('output.mp4');

        const mp4Blob = new Blob([data], { type: 'video/mp4' });

        const url = URL.createObjectURL(mp4Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'visualization.mp4';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Video exported successfully!');
      };

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      mediaRecorder.start();
      toast.info('Exporting visualization...');

      if (audioRef.current) {
        setTimeout(() => {
          mediaRecorder.stop();
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }, audioRef.current.duration * 1000);
      }
    } catch (error) {
      console.error('Error during export:', error);
      toast.error('Failed to export video. Please try again.');
    }
  };

  const setupAudioContext = () => {
    if (!audioRef.current) return;

    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createMediaElementSource(
      audioRef.current
    );

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
        setProgress(
          (audioRef.current.currentTime / audioRef.current.duration) * 100
        );
      }

      animationFrameRef.current = requestAnimationFrame(updateData);
    };

    updateData();
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      toast.info('Playback paused');
    } else {
      audioRef.current.play();
      toast.success('Playback started');
    }
    setIsPlaying(!isPlaying);
  };

  const VisualizerComponent = {
    bar: BarVisualizer,
    wave: WaveVisualizer,
    circular: CircularVisualizer,
    spiral: SpiralVisualizer,
  }[visualizerType];

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
            Sound Visualizer
          </h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-white/10">
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
                  onValueChange={(value) =>
                    setVisualizerType(value as typeof visualizerType)
                  }>
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
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="spiral" id="spiral" />
                    <Label htmlFor="spiral">Spiral Visualization</Label>
                  </div>
                </RadioGroup>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="aspect-video bg-black rounded-lg backdrop-blur-sm border border-white/10 overflow-hidden mb-8 shadow-xl">
          <VisualizerComponent audioData={audioData} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={togglePlayPause}
              variant="secondary"
              className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white backdrop-blur-sm">
              {isPlaying ? (
                <Pause className="mr-2" />
              ) : (
                <Play className="mr-2" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white backdrop-blur-sm"
              onClick={() => document.getElementById('file-upload')?.click()}>
              <Upload className="mr-2" />
              Upload Audio
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white backdrop-blur-sm"
              onClick={handleDownload}>
              <Download className="mr-2" />
              Download Video
            </Button>
          </div>
          <Progress value={progress} className="w-full h-2 bg-white/10" />
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

const toBlobURL = async (url: string, type: string) => {
  return URL.createObjectURL(
    new Blob([await (await fetch(url)).text()], { type })
  );
};

export default Index;
