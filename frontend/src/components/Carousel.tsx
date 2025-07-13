"use client";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useState, useRef, useId, useEffect } from "react";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useStreak } from "@/lib/streakContext";

import styles from "@/components/Carousel.module.css";

interface SlideData {
  analogy: Record<string, string>;
  src: string;
  id: string;
  isBlurred?: boolean;
  isTitlePage?: boolean;
  isBackCover?: boolean;
  originalSlides?: SlideData[]; // Add this for title page
}

interface SlideProps {
  slide: SlideData;
  index: number;
  current: number;
  handleSlideClick: (index: number) => void;
}

const Slide = ({ slide, index, current, handleSlideClick }: SlideProps) => {
  const slideRef = useRef<HTMLLIElement>(null);
  const xRef = useRef(0);
  const yRef = useRef(0);
  const frameRef = useRef<number>(0);

  const { src, analogy } = slide;

  const [carouselSize, setCarouselSize] = useState(0);
  const [cents, setCents] = useState<number | null>(null);

  useEffect(() => {
    const updateSize = () => {
      // Use 95% of the smaller viewport dimension
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const minDimension = Math.min(viewportHeight, viewportWidth);
      const targetSize = minDimension * 0.95;

      // Reserve space for controls (about 10% of the target size)
      const controlSpace = targetSize * 0.1;
      const carouselSize = targetSize - controlSpace;

      setCarouselSize(carouselSize);
    };

    updateSize(); // Initial run
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const animate = () => {
      if (!slideRef.current) return;
      slideRef.current.style.setProperty("--x", `${xRef.current}px`);
      slideRef.current.style.setProperty("--y", `${yRef.current}px`);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent) => {
    const el = slideRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
    yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
  };

  const handleMouseLeave = () => {
    xRef.current = 0;
    yRef.current = 0;
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = event.currentTarget;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 10;
      canvas.height = 10;
      ctx?.drawImage(img, 0, 0, 10, 10);
      const data = ctx?.getImageData(0, 0, 10, 10).data;
      if (data) {
        let r = 0,
          g = 0,
          b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        r /= 100;
        g /= 100;
        b /= 100;
        // Brightness calculation removed as it's not used
      }
    } catch {
      console.warn("Tainted canvas: defaulting to white text");
      // setIsDark(true); // This line was removed
    }
  };

  const renderBoldOnlyMarkdown = (text: string) => {
    // Remove all newlines and triple dashes
    const sanitized = text.replace(/\n/g, " ").replace(/---/g, "");

    // Replace **bold** syntax with styled span
    const html = sanitized.replace(
      /\*\*(.*?)\*\*/g,
      (_, match) =>
        `<span style="font-family: KomikaHandBoldItalic, cursive; font-weight: bold; font-style: italic; font-size: clamp(0.5rem, 2.8vw, 1.1rem);">${match}</span>`
    );

    return html;
  };

  useEffect(() => {
    // Generate a random number between 1 and 99
    const randomCents = Math.floor(Math.random() * 99) + 1;
    setCents(randomCents);
  }, []);

  return (
    <div className="[perspective:1200px] [transform-style:preserve-3d]">
      <li
        ref={slideRef}
        className="flex flex-1 flex-col items-center justify-center relative text-center opacity-100 transition-all duration-300 ease-in-out mx-[4vmin] z-10"
        onClick={() => handleSlideClick(index)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: `${carouselSize}px`,
          height: `${carouselSize}px`,
          transform:
            current !== index
              ? "scale(0.98) rotateX(8deg)"
              : "scale(1) rotateX(0deg)",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "bottom",
        }}
      >
        <BackgroundGradient containerClassName="absolute top-0 left-0 w-full h-full rounded-lg overflow-hidden p-1">
          <div className="relative w-full h-full">
            {slide.isTitlePage ? (
              // Title page layout
              <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-600 rounded-lg shadow-2xl overflow-hidden relative font-[KomikaHandBoldItalic] flex flex-col">
                {/* Comic burst spikes background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="relative w-full h-full">
                    {[...Array(48)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          width: "max(2vw, 10px)", // never thinner than 10px
                          height: "min(60vw, 60vh)", // always fits within the smallest dimension
                          transform: `rotate(${
                            (360 / 48) * i
                          }deg) translateY(min(90vw, 90vh))`,
                          transformOrigin: "center center",
                          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                          backgroundColor: "#e6e6e6",
                          border: "2px solid black",
                          boxShadow: "0 0 2px 0 #000",
                        }}
                      />
                    ))}
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          width: "max(2vw, 10px)", // never thinner than 10px
                          height: "min(70vw, 70vh)", // always fits within the smallest dimension
                          transform: `rotate(${
                            (360 / 20) * i
                          }deg) translateY(min(90vw, 90vh))`,
                          transformOrigin: "center center",
                          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                          backgroundColor: "#a3a2a2",
                          border: "2px solid black",
                          boxShadow: "0 0 2px 0 #000",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Top Purple Bar with Issue Box + Author */}
                <div className="w-full h-8 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 flex items-center px-2 sm:px-4 mt-[3%] sm:mt-[5%] z-10 tracking-wider">
                  <div className="flex items-center gap-2 sm:gap-4 md:gap-8 w-full">
                    {/* Top Left Sharp Box for Issue & Price */}
                    <div className="bg-gray-200 border border-black sm:border-2 rounded-md px-2 sm:px-3 md:px-4 py-1 text-[8px] sm:text-[10px] md:text-lg font-[NewComicTitleLaserRegular] text-black flex-shrink-0">
                      <p className="leading-tight">
                        Issue{" "}
                        <span className="underline">
                          #{useStreak().lifetimeAnalogies}
                        </span>
                      </p>
                      <p className="leading-tight">
                        <span className="text-blue-500 text-[10px] sm:text-[15px] md:text-2xl">
                          ONLY
                        </span>
                        <br />
                        <span>{cents !== null ? `${cents}¢` : "..."}</span>
                      </p>
                    </div>

                    {/* "By Analogous" text */}
                    <p className="text-sm sm:text-lg md:text-xl text-white font-[NewComicTitleLaserRegular] tracking-widest flex-1 text-center">
                      By Analogous
                    </p>
                  </div>
                </div>

                {/* Middle Section - Title */}
                <div className="flex-1 flex items-center justify-center px-2 sm:px-4 md:px-6 lg:px-8 relative z-[999]">
                  <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-[NewComicTitle3D] text-purple leading-tight transform rotate-[-10deg] w-[95%] sm:w-[90%] text-center">
                    {slide.analogy.title || "Analogous Comics Series"}
                  </h1>
                </div>

                {/* Bottom Section - 3 Photos */}
                <div className="w-full flex justify-between items-center px-1 sm:px-2 md:px-3 pb-2 sm:pb-3 md:pb-4 lg:pb-6 space-x-0.5 sm:space-x-1 md:space-x-2 z-10">
                  {slide.originalSlides?.map((originalSlide, imgIndex) => (
                    <div
                      key={imgIndex}
                      className="flex-1 max-w-[30%] sm:max-w-[35%] md:max-w-[40%] aspect-[3/4] rounded-md overflow-hidden border border-black sm:border-2"
                    >
                      <img
                        src={originalSlide.src}
                        alt={`Chapter ${imgIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Ellipse-shaped "Powered by SDXL" text box */}
                <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-30">
                  <div
                    className="bg-gray-100 border border-black sm:border-2 shadow-lg px-3 sm:px-4 md:px-7 lg:px-8 xl:px-9 2xl:px-10 py-1 sm:py-2 md:py-2 lg:py-3"
                    style={{
                      borderRadius: "60% 80% 70% 90% / 70% 60% 80% 60%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <p className="text-[10px] sm:text-[12px] md:text-[15px] lg:text-xl uppercase font-[Inter] font-bold text-black whitespace-nowrap">
                      Powered by
                    </p>
                    <p className="underline text-[12px] sm:text-[15px] md:text-[20px] lg:text-2xl font-[NewComicTitleLaserRegular] tracking-wider text-blue-500 whitespace-nowrap">
                      SDXL
                    </p>
                  </div>
                </div>

                {/* Background Purple Trapezoid */}
                <div className="absolute bottom-0 left-0 w-full h-[35%] z-0">
                  <div
                    className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{
                      clipPath: "polygon(0% 40%, 100% 0%, 100% 100%, 0% 100%)",
                    }}
                  />
                </div>
              </div>
            ) : slide.isBackCover ? (
              // Back cover layout - fully responsive
              <div className="w-full h-full rounded-lg shadow-2xl overflow-hidden relative">
                {/* Always side-by-side layout, even on mobile */}
                <div className="w-full h-full flex flex-row">
                  {/* Left side - Blurred image (smaller on mobile) */}
                  <div className="w-[30%] sm:w-[35%] md:w-[40%] h-full relative">
                    <img
                      src={slide.src}
                      alt="blurred background"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Right side - Information panel (larger on mobile) */}
                  <div className="w-[70%] sm:w-[65%] md:w-[60%] h-full bg-gradient-to-r from-gray-900 to-gray-600 flex flex-col p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 overflow-y-auto">
                    {/* Compact content layout for small screens */}
                    <div className="flex flex-col h-full justify-start space-y-1 sm:space-y-2 md:space-y-3 lg:space-y-4">
                      {/* Top section - Branding */}
                      <div className="text-center space-y-0.5 sm:space-y-1">
                        <p className="text-[6px] sm:text-[8px] md:text-[10px] lg:text-xs text-gray-300 uppercase tracking-wider">
                          Produced by
                        </p>
                        <p className="text-[10px] sm:text-xs md:text-sm lg:text-lg xl:text-xl font-bold text-white font-[NewComicTitleLaserRegular] tracking-wider">
                          Analogous
                        </p>
                        <p className="text-[5px] sm:text-[6px] md:text-[8px] lg:text-xs text-gray-400 italic">
                          Powered by SDXL and Gemini
                        </p>
                      </div>

                      {/* Summary section */}
                      <div className="text-center space-y-0.5 sm:space-y-1 flex-1 flex flex-col justify-center min-h-0">
                        <p className="text-[6px] sm:text-[8px] md:text-[10px] lg:text-xs text-gray-300 uppercase tracking-wider">
                          Summary
                        </p>
                        <p className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-bold text-white font-[NewComicTitleLaserRegular] tracking-wider leading-tight px-0.5 sm:px-1 break-words">
                          {slide.analogy.summary || "No summary available"}
                        </p>
                      </div>

                      {/* Middle section - Analogy ID */}
                      <div className="text-center space-y-0.5 sm:space-y-1">
                        <p className="text-[6px] sm:text-[8px] md:text-[10px] text-gray-300 uppercase tracking-wider">
                          Analogy ID
                        </p>
                        <p className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-mono font-bold text-white break-all">
                          {slide.id || "ANLG-001"}
                        </p>
                      </div>

                      {/* Bottom section - Barcode */}
                      <div className="flex justify-center pt-0.5 sm:pt-1 md:pt-2">
                        <div
                          className="bg-white border border-black sm:border-2 px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 rounded-md w-[60px] sm:w-[70px] md:w-[80px] lg:w-[100px] xl:w-[120px] flex-shrink-0"
                          ref={(el) => {
                            if (!el) return;

                            const containerWidth = el.clientWidth;
                            const barWidth = Math.max(
                              1,
                              Math.floor(containerWidth / 60)
                            ); // Responsive bar width
                            const barGap = Math.max(0.5, barWidth * 0.5); // Responsive gap
                            const barCount = Math.floor(
                              containerWidth / (barWidth + barGap)
                            );

                            el.querySelector(".barcode-bars")!.innerHTML = ""; // Clear old bars

                            Array.from({ length: barCount }).forEach(() => {
                              const bar = document.createElement("div");
                              bar.style.width = `${
                                Math.random() > 0.9 ? barWidth * 2 : barWidth
                              }px`;
                              bar.style.height = `100%`;
                              bar.style.backgroundColor = "black";
                              bar.style.display = "inline-block";
                              bar.style.marginRight = `${barGap}px`;
                              el.querySelector(".barcode-bars")!.appendChild(
                                bar
                              );
                            });
                          }}
                        >
                          <div className="barcode-bars flex items-end w-full h-[15px] sm:h-[18px] md:h-[20px] lg:h-[25px] xl:h-[30px]" />
                          <p className="text-[4px] sm:text-[5px] md:text-[6px] lg:text-[8px] font-mono text-black mt-0.5 tracking-[0.05em] sm:tracking-[0.1em] md:tracking-[0.15em] text-center">
                            9 781234 567890
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Regular slide layout
              <>
                <img
                  className={`w-full h-full object-cover rounded-lg ${
                    slide.isBlurred ? "filter blur-lg brightness-75" : ""
                  }`}
                  src={src}
                  alt="story image"
                  onLoad={handleImageLoad}
                  loading="eager"
                  decoding="sync"
                />

                {(() => {
                  const sectionMap = [
                    ["chapter1section1", "chapter1section2"],
                    ["chapter2section1", "chapter2section2"],
                    ["chapter3section1", "chapter3section2"],
                  ];

                  // Only apply to analogy slides (not title or back cover)
                  if (index === 1 || index === 3 || index === 5) {
                    // Clear slides
                    const originalIndex = Math.floor((index - 1) / 2);
                    const [primaryKey] = sectionMap[originalIndex];
                    const firstSubsectionHtml = renderBoldOnlyMarkdown(
                      analogy[primaryKey]
                    );
                    let bubbleClass = styles["speech-bubble-secondary"];
                    if (index === 3)
                      bubbleClass = styles["speech-bubble-third"];
                    if (index === 5)
                      bubbleClass = styles["speech-bubble-fourth"];

                    // Character quotes for each chapter
                    const characterQuotes = [
                      slide.analogy.chapter1quote,
                      slide.analogy.chapter2quote,
                      slide.analogy.chapter3quote,
                    ];

                    // Character speech bubble styling for each chapter
                    const characterBubbleStyles = [
                      styles["character-bubble-top-left"],
                      styles["character-bubble-top-right"],
                      styles["character-bubble-middle-left"],
                    ];

                    return (
                      <>
                        <div
                          className={`${styles["speech-bubble"]} ${styles["speech-bubble-default"]} ${bubbleClass} ${styles["no-arrow"]}`}
                          dangerouslySetInnerHTML={{
                            __html: firstSubsectionHtml,
                          }}
                        />
                        {/* Character speech bubble */}
                        <div
                          className={`${styles["character-speech-bubble"]} ${characterBubbleStyles[originalIndex]}`}
                        >
                          {characterQuotes[originalIndex]}
                        </div>
                      </>
                    );
                  } else if (index === 2 || index === 4 || index === 6) {
                    // Blurred slides
                    const originalIndex = Math.floor((index - 2) / 2);
                    const [, secondaryKey] = sectionMap[originalIndex];
                    const secondSubsectionHtml = renderBoldOnlyMarkdown(
                      analogy[secondaryKey]
                    );
                    return (
                      <div
                        className={`${styles["speech-bubble"]} ${styles["speech-bubble-default"]} ${styles["speech-bubble-primary"]}`}
                        dangerouslySetInnerHTML={{
                          __html: secondSubsectionHtml,
                        }}
                      />
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        </BackgroundGradient>
      </li>
    </div>
  );
};

const CarouselControl = ({
  type,
  title,
  handleClick,
}: {
  type: "previous" | "next";
  title: string;
  handleClick: () => void;
}) => {
  return (
    <button
      className={`mx-2 focus:outline-none transition duration-200 ${
        type === "previous" ? "rotate-180" : ""
      }`}
      title={title}
      onClick={handleClick}
    >
      <IconArrowNarrowRight className="text-white w-6 h-6 hover:scale-[1.3] transition-all duration-200" />
    </button>
  );
};

export default CarouselControl;

interface CarouselProps {
  slides: SlideData[];
}

export function Carousel({ slides }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [carouselSize, setCarouselSize] = useState(0);
  const [containerSize, setContainerSize] = useState(0);

  // Create expanded slides array with blurred versions
  const expandedSlides = [
    // Title page (comic book cover style)
    {
      analogy: slides[0].analogy, // Use first slide's analogy for title
      src: "", // No image for title page
      id: slides[0].id,
      isTitlePage: true,
      originalSlides: slides, // Pass the original slides data to the title page
    },
    // Original slides with blurred versions
    ...slides.flatMap((slide) => [
      slide, // Original slide
      { ...slide, isBlurred: true }, // Blurred version
    ]),
    // Back cover page (comic book back cover style)
    {
      analogy: slides[0].analogy, // Use first slide's analogy for ID
      src: slides[0].src, // Use first slide's image for back cover
      isBackCover: true,
      id: slides[0].id,
    },
  ];

  useEffect(() => {
    const updateSize = () => {
      // Use 95% of the smaller viewport dimension
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const minDimension = Math.min(viewportHeight, viewportWidth);
      const targetSize = minDimension * 0.95;

      // Reserve space for controls (about 10% of the target size)
      const controlSpace = targetSize * 0.1;
      const carouselSize = targetSize - controlSpace;

      setCarouselSize(carouselSize);
      setContainerSize(targetSize);
    };

    updateSize(); // Initial run
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handlePreviousClick = () => {
    const previous = current - 1;
    setCurrent(previous < 0 ? expandedSlides.length - 1 : previous);
  };

  const handleNextClick = () => {
    const next = current + 1;
    setCurrent(next === expandedSlides.length ? 0 : next);
  };

  const handleSlideClick = (index: number) => {
    if (current !== index) {
      setCurrent(index);
    }
  };

  const id = useId();

  return (
    <div
      className="flex flex-col items-center justify-center mx-auto"
      style={{
        width: `${containerSize}px`,
        height: `${containerSize}px`,
      }}
    >
      {/* Carousel Container */}
      <div
        className="relative scrollbar-hide"
        style={{
          width: `${carouselSize}px`,
          height: `${carouselSize}px`,
        }}
        aria-labelledby={`carousel-heading-${id}`}
      >
        <ul
          className="absolute flex mx-[-4vmin] transition-transform duration-1000 ease-in-out"
          style={{
            transform: `translateX(-${
              current * (100 / expandedSlides.length)
            }%)`,
          }}
        >
          {expandedSlides.map((slide, index) => (
            <Slide
              key={index}
              slide={slide}
              index={index}
              current={current}
              handleSlideClick={handleSlideClick}
            />
          ))}
        </ul>
      </div>

      {/* Control Arrows - positioned within the 95% container */}
      <div className="flex justify-center items-center mt-4 space-x-4">
        <CarouselControl
          type="previous"
          title="Go to previous slide"
          handleClick={handlePreviousClick}
        />
        <CarouselControl
          type="next"
          title="Go to next slide"
          handleClick={handleNextClick}
        />
      </div>
    </div>
  );
}
