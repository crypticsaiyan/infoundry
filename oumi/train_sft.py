"""
Oumi SFT Training Script for InFoundry Architect
Trains on generated_training_data.jsonl with proper architecture plan format.
"""

from pathlib import Path

from oumi import train
from oumi.core.configs import TrainingConfig
from oumi.core.configs.params.model_params import ModelParams
from oumi.core.configs.params.training_params import TrainingParams, TrainerType
from oumi.core.configs.params.data_params import DataParams, DatasetParams, DatasetSplitParams
from oumi.core.configs.params.peft_params import PeftParams


def run_training():
    """
    Run SFT training on architecture recommendation data using Oumi.
    
    Checks for the presence of generated_training_data.jsonl, builds a TrainingConfig with model, training, data, and LoRA (PEFT) settings, and runs training when the data file exists. If the data file is missing the function prints an error and returns without running training.
    
    Returns:
        The object returned by train(config) when training runs, or `None` if training did not start because the data file was missing.
    """
    
    # Check that training data exists
    data_file = Path("generated_training_data.jsonl")
    if not data_file.exists():
        print("❌ Training data not found. Run: python generate_training_data.py --count 500")
        return
    
    # Count examples
    with open(data_file) as f:
        num_examples = sum(1 for _ in f)
    print(f"📊 Training on {num_examples} examples from {data_file}")
    
    # Configure training - use 0.5B model but train longer for better results
    config = TrainingConfig(
        model=ModelParams(
            # Using 1.5B model (trained on Colab T4)
            model_name="Qwen/Qwen2.5-1.5B-Instruct",
            trust_remote_code=True,
        ),
        training=TrainingParams(
            trainer_type=TrainerType.TRL_SFT,
            output_dir="./trained_model",
            num_train_epochs=5,  # More epochs for better learning
            per_device_train_batch_size=1,  # Small batch to save memory
            gradient_accumulation_steps=8,  # Effective batch size = 8
            learning_rate=5e-6,  # Lower LR for fine-grained learning
            max_steps=500,  # Many more steps
            save_steps=100,
            logging_steps=25,
            use_peft=True,
            warmup_ratio=0.1,
        ),
        data=DataParams(
            train=DatasetSplitParams(
                datasets=[
                    DatasetParams(
                        dataset_name="text_sft",
                        dataset_path=str(data_file.absolute()),
                    )
                ]
            )
        ),
        peft=PeftParams(
            lora_r=64,  # Higher rank for better capacity
            lora_alpha=128,
            lora_dropout=0.05,
        ),
    )
    
    print("=" * 60)
    print("  InFoundry Architect - Oumi SFT Training")
    print("  Training on architecture recommendation data")
    print("=" * 60)
    print(f"  Model: {config.model.model_name}")
    print(f"  Training Type: SFT with LoRA")
    print(f"  Data: {data_file} ({num_examples} examples)")
    print(f"  Max Steps: {config.training.max_steps}")
    print(f"  LoRA rank: {config.peft.lora_r}")
    print(f"  Output: {config.training.output_dir}")
    print("=" * 60)
    
    # Run training
    result = train(config)
    
    print("\n✓ Training complete!")
    print(f"  Model saved to: {config.training.output_dir}")
    
    return result


if __name__ == "__main__":
    run_training()
