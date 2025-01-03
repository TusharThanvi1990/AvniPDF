import React, { useState } from "react";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { motion } from "framer-motion";

const TextCard = ({ t, i }: { t: string; i: number }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied To Clipboard.");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Hide the message after 2 seconds
  };

  const downloadAsPDF = (txt: string) => {
    const doc = new jsPDF();
    doc.text(txt, 10, 10);
    doc.save(`extracted_text_${i + 1}.pdf`);
  };

  const downloadAsWord = async (txt: string) => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun(txt)],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_text_${i + 1}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="w-full flex flex-col gap-4 p-4 bg-[var(--card-bg)] rounded-xl shadow-lg border-2 border-dotted border-red-500"
      whileHover={{ scale: 1.05 }}
    >
      <textarea
        className="w-full outline-none rounded-xl text-red-500 min-h-[25vh] md:min-h-[50vh] bg-[var(--card-bg)] p-5 tracking-wider font-[300] text-sm border border-gray-700"
        defaultValue={t}
      ></textarea>
      <div className="flex justify-between items-center">
        <span className="text-sm text-red-500">
          {"Extracted Text"}
        </span>
        <button
          onClick={() => {
            copyToClipboard(t);
          }}
          className="py-2 px-4 rounded-md transition-colors duration-200 shadow-md hover:shadow-lg"
          style={{
            background: 'var(--hero-bg)',
            color: 'var(--hero-text)',
          }}
        >
          Copy
        </button>
      </div>
      <div className="flex justify-between items-center mt-2">
        <button
          onClick={() => downloadAsPDF(t)}
          className="py-2 px-4 rounded-md transition-colors duration-200 shadow-md hover:shadow-lg"
          style={{
            background: 'var(--hero-bg)',
            color: 'var(--hero-text)',
          }}
        >
          Download as PDF
        </button>
        <button
          onClick={() => downloadAsWord(t)}
          className="py-2 px-4 rounded-md transition-colors duration-200 shadow-md hover:shadow-lg"
          style={{
            background: 'var(--hero-bg)',
            color: 'var(--hero-text)',
          }}
        >
          Download as Word
        </button>
      </div>
      {copied && (
        <div className="text-center text-green-500 mt-2 p-2 border border-green-500 rounded-md shadow-md bg-green-100 dark:bg-green-900/20">
          Text Copied
        </div>
      )}
    </motion.div>
  );
};

export default TextCard;